const ImageKit = require('imagekit');

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

exports.getAuthParameters = (req, res) => {
    try {
        const authenticationParameters = imagekit.getAuthenticationParameters();
        // console.log('ImageKit Auth Parameters generated:', authenticationParameters);
        res.send(authenticationParameters);
    } catch (error) {
        console.error('Error generating ImageKit auth parameters:', error);
        res.status(500).send({ error: 'Failed to generate auth' });
    }
};

const deleteImage = async (url) => {
    if (!url) return false;

    try {
        // Extraer el nombre del archivo: funciona para URLs completas o solo nombres
        // Maneja URLs como: https://ik.imagekit.io/endpoint/folder/file.jpg?tr=...
        // O simplemente: folder/file.jpg o file.jpg
        const fileName = url.split('/').pop().split('?')[0];

        // console.log(`Attempting to delete image from ImageKit. Original URL/Path: ${url} | Extracted name: ${fileName}`);

        // Buscar el archivo para obtener su fileId
        const files = await imagekit.listFiles({
            name: fileName
        });

        // console.log(`ImageKit listFiles search for "${fileName}" returned ${files?.length || 0} matches.`);

        if (files && files.length > 0) {
            const fileId = files[0].fileId;
            // console.log(`Found fileId: ${fileId}. Proceeding with deletion...`);
            await imagekit.deleteFile(fileId);
            // console.log(`Successfully deleted fileId ${fileId} from ImageKit (${fileName})`);
            return true;
        } else {
            // console.warn(`File "${fileName}" not found in ImageKit records.`);
            return false;
        }
    } catch (error) {
        console.error('Error during ImageKit deletion process:', error);
        return false;
    }
};

exports.deleteImage = deleteImage;

exports.getAuthParameters = (req, res) => {
    try {
        const authenticationParameters = imagekit.getAuthenticationParameters();
        console.log('ImageKit Auth Parameters generated:', authenticationParameters);
        res.send(authenticationParameters);
    } catch (error) {
        console.error('Error generating ImageKit auth parameters:', error);
        res.status(500).send({ error: 'Failed to generate auth' });
    }
};

exports.deleteImageByURL = async (req, res) => {
    const { url } = req.body;
    const success = await deleteImage(url);
    if (success) {
        res.send({ message: 'File deleted successfully' });
    } else {
        res.status(404).send({ error: 'File not found or invalid URL' });
    }
};
