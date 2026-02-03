/**
 * Resize an image if it exceeds specific dimensions.
 * @param {File} file - The original file.
 * @param {number} maxWidth - Max width (default 1920).
 * @param {number} maxHeight - Max height (default 1080).
 * @param {number} quality - JPEG quality (0 to 1).
 * @returns {Promise<Blob>} - The resized image blob.
 */
export const resizeImage = (file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                // Keep transparency for PNG/WEBP
                const fileType = file.type;
                if (fileType === 'image/jpeg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        // Create a new File object with the same name and original type
                        const resizedFile = new File([blob], file.name, {
                            type: fileType,
                            lastModified: Date.now(),
                        });
                        resolve(resizedFile);
                    } else {
                        reject(new Error('Canvas to Blob failed'));
                    }
                }, fileType, (fileType === 'image/jpeg' || fileType === 'image/webp') ? quality : undefined);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
