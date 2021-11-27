import { v2 as sdk } from "cloudinary";

export async function uploadImage(url: string, id: string) {
  return await sdk.uploader.upload(url, {
    public_id: id,
    folder: "beers",
  });
}
