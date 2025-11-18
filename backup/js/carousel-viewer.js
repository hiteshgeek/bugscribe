export class CarouselViewer {
  constructor(modalEl) {
    // modalEl may be null if the expected DOM is not present.
    // Make the viewer defensive: keep methods no-op when missing.
    this.modalEl = modalEl || null;
    this.slidesEl = modalEl ? modalEl.querySelector(".slides") : null;
    this.index = 1;
  }

  open(items, index) {
    if (!this.modalEl || !this.slidesEl) return;

    this.index = index;
    this.slidesEl.innerHTML = "";

    items.forEach((item) => {
      const slide = document.createElement("div");
      slide.className = "slide";

      if (item.type === "video") {
        const v = document.createElement("video");
        v.src = item.url;
        v.controls = true;
        slide.appendChild(v);
      } else {
        const img = document.createElement("img");
        img.src = item.url;
        slide.appendChild(img);
      }

      this.slidesEl.appendChild(slide);
    });

    this.showSlide(index);
    this.modalEl.classList.add("open");
  }

  close() {
    if (!this.modalEl || !this.slidesEl) return;

    this.modalEl.classList.remove("open");
    this.slidesEl.querySelectorAll("video").forEach((v) => {
      v.pause();
      v.src = "";
    });
    this.slidesEl.innerHTML = "";
  }

  showSlide(i) {
    if (!this.slidesEl) return;

    const slides = [...this.slidesEl.children];
    if (!slides.length) return;

    i = ((i - 1 + slides.length) % slides.length) + 1;
    this.index = i;

    slides.forEach((slide, idx) => {
      slide.classList.toggle("active", idx + 1 === i);
    });
  }
}
