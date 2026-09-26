const IMAGE_WIDTH = 1600;
const IMAGE_HEIGHT = 1200;

/** Crop vehicle photos from the center to the catalog's 4:3 format. */
export async function cropVehicleImage(file: File): Promise<File> {
  const image = await createImageBitmap(file);
  try {
    const cropWidth = Math.min(image.width, image.height * 4 / 3);
    const cropHeight = cropWidth * 3 / 4;
    const sourceX = (image.width - cropWidth) / 2;
    const sourceY = (image.height - cropHeight) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = IMAGE_WIDTH;
    canvas.height = IMAGE_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a fotografia.");
    context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
    if (!blob) throw new Error("Não foi possível cortar a fotografia.");
    const name = file.name.replace(/\.[^.]+$/, "") || "fotografia";
    return new File([blob], `${name}.webp`, { type: "image/webp", lastModified: Date.now() });
  } finally {
    image.close();
  }
}
