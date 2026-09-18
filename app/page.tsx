import ImageGalleryExperience from "@/components/ImageGalleryExperience";

import ScrollExpandMedia from "@/components/ui/scroll-expansion-hero";
import { galleryImages } from "@/lib/gallery-images";

export default function Home() {
  return <main>
    <ScrollExpandMedia
      mediaType="image"
      mediaSrc={galleryImages[3].src}
      mediaAlt={galleryImages[3].alt}
      bgImageSrc={galleryImages[5].src}
      title="Stillness in motion."
      scrollToExpand="Scroll to unfold"
      textBlend
    />
    <ImageGalleryExperience />
  </main>;
}
