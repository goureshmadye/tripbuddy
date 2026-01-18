import { storage } from "@/config/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

/**
 * Uploads a file (blob) to Firebase Storage from a local URI
 * @param uri Local file URI
 * @param storagePath Full path in storage (e.g. 'trips/123/documents/file.jpg')
 * @param mimeType Optional mime type
 * @returns Promise resolving to the download URL
 */
export const uploadFileToStorage = async (
  uri: string,
  storagePath: string,
  mimeType?: string,
): Promise<string> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, blob, {
      contentType: mimeType || "application/octet-stream",
    });

    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};
