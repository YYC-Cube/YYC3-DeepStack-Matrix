class LazyLoader {
  constructor() {
    this.observer = new IntersectionObserver(this.onIntersect, {
      rootMargin: '50px'
    });
    this.observeElements();
  }

  observeElements() {
    document.querySelectorAll('[data-lazy]').forEach(el => {
      this.observer.observe(el);
    });
  }

  onIntersect(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const src = element.dataset.src;
        element.src = src;
        element.classList.add('loaded');
        this.observer.unobserve(element);
      }
    });
  }
}
