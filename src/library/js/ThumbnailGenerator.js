// ThumbnailGenerator.js
export default class ThumbnailGenerator {
  async createImageThumbnail(imageUrl, maxWidth = 300, maxHeight = 200) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width *= ratio;
        height *= ratio;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageUrl;
    });
  }

  async createVideoThumbnail(
    videoUrl,
    maxWidth = 300,
    maxHeight = 200,
    timeInSeconds = 1
  ) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.style.display = "none";
      document.body.appendChild(video);

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(timeInSeconds, video.duration);
      };

      video.onseeked = () => {
        try {
          let { videoWidth: width, videoHeight: height } = video;

          const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
          width *= ratio;
          height *= ratio;

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, width, height);

          const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);

          if (video.parentNode) {
            document.body.removeChild(video);
          }
          video.src = "";

          resolve(thumbnailUrl);
        } catch (error) {
          if (video.parentNode) {
            document.body.removeChild(video);
          }
          reject(error);
        }
      };

      video.onerror = () => {
        if (video.parentNode) document.body.removeChild(video);
        reject(new Error("Failed to load video"));
      };

      video.src = videoUrl;
      video.load();
    });
  }
}
