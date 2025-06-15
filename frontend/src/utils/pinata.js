import axios from 'axios';

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;

// Dosyayı IPFS'e yükle
export const uploadFileToIPFS = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const pinataMetadata = JSON.stringify({
      name: file.name,
    });
    formData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', pinataOptions);

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: 'Infinity',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'Authorization': `Bearer ${PINATA_JWT}`,
        },
      }
    );

    return {
      success: true,
      ipfsHash: response.data.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
    };
  } catch (error) {
    console.error('IPFS yükleme hatası:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// JSON metadata'yı IPFS'e yükle
export const uploadJSONToIPFS = async (jsonData) => {
  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      jsonData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PINATA_JWT}`,
        },
      }
    );

    return {
      success: true,
      ipfsHash: response.data.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
    };
  } catch (error) {
    console.error('JSON IPFS yükleme hatası:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// NFT metadata oluştur ve IPFS'e yükle
export const createAndUploadMetadata = async (name, description, imageUrl, attributes = []) => {
  try {
    const metadata = {
      name,
      description,
      image: imageUrl,
      attributes
    };

    const result = await uploadJSONToIPFS(metadata);
    return result;
  } catch (error) {
    console.error('Metadata oluşturma hatası:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// IPFS URL'den veri getir
export const fetchFromIPFS = async (ipfsHash) => {
  try {
    const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('IPFS veri alma hatası:', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 