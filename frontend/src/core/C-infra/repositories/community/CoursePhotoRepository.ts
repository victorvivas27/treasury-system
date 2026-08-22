import type { CoursePhoto } from "@/core/A-domain/entities/community/CoursePhoto";
import { apiClient } from "@/core/D-config/api";

const baseUrl = "/community/gallery";
export const coursePhotos = {
  async list(): Promise<CoursePhoto[]> { return (await apiClient.get(baseUrl)).data; },
  async loadImageUrl(photo: CoursePhoto) {
    const response = await apiClient.get<Blob>(photo.imageUrl, { responseType: "blob" });
    return URL.createObjectURL(response.data);
  },
  async upload(file: File, caption: string): Promise<CoursePhoto> {
    const data = new FormData(); data.append("file", file); if (caption.trim()) data.append("caption", caption.trim());
    return (await apiClient.post(baseUrl, data, { headers: { "Content-Type": "multipart/form-data" } })).data;
  },
  async update(id: number, caption: string, displayOrder: number): Promise<CoursePhoto> {
    return (await apiClient.put(`${baseUrl}/${id}`, { caption: caption.trim() || null, displayOrder })).data;
  },
  async delete(id: number) { await apiClient.delete(`${baseUrl}/${id}`); },
};
