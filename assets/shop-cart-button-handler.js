// Delegado a nivel documento (no por-form en DOMContentLoaded): las cards de
// recomendados llegan por fetch DESPUES de la carga y tambien deben abrir el drawer.
// Solo intercepta el form de la card de la casa (.collection-card-atc-form); el buy
// box de la ficha tiene su propia maquinaria y se respeta via defaultPrevented.
(function () {
  if (window.__msCardAtcDelegated) return;
  window.__msCardAtcDelegated = true;
  document.addEventListener("submit", function (event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.classList.contains("collection-card-atc-form")) return;
    if (event.defaultPrevented) return;
    if (form.dataset.cartAction === "redirect") return;
    const cartDrawer = document.querySelector("cart-drawer");
    if (!cartDrawer) return;
    event.preventDefault();
    const submitButton = form.querySelector('[type="submit"]');
    let loadingSpinner = submitButton?.querySelector(".loading__spinner");
    if (submitButton) {
      submitButton.setAttribute("aria-disabled", "true");
      submitButton.classList.add("loading");
      if (loadingSpinner) loadingSpinner.classList.remove("hidden");
    }
    const formData = new FormData(form);
    formData.append("sections", "cart-drawer,cart-icon-bubble");
    formData.append("sections_url", window.location.pathname);
    fetch(window.routes.cart_add_url, {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
      body: formData,
    })
      .then((response) => {
        if (!response.ok && response.status !== 422) throw new Error("cart-network");
        // Sin JSON valido tras un 2xx el producto YA se agrego: re-enviar el form lo duplicaria
        return response.json().catch(() => { throw new Error("cart-parse"); });
      })
      .then((response) => {
        if (response.status) {
          console.error("Error adding to cart:", response.description);
          const errorContainer = form.querySelector(".product-form__error-message");
          if (errorContainer) {
            errorContainer.textContent = response.description || "Error adding to cart";
            errorContainer.closest(".product-form__error-message-wrapper")?.removeAttribute("hidden");
          } else {
            alert(response.description || "Error adding product to cart");
          }
        } else {
          try {
            cartDrawer.renderContents(response);
          } catch (renderError) {
            console.error("Drawer render failed after add:", renderError);
            if (typeof cartDrawer.refreshCartDrawer === "function") cartDrawer.refreshCartDrawer();
          }
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        if (error && error.message === "cart-network") {
          form.submit();
        } else {
          window.location.href = "/cart";
        }
      })
      .finally(() => {
        if (submitButton) {
          submitButton.classList.remove("loading");
          submitButton.removeAttribute("aria-disabled");
          if (loadingSpinner) loadingSpinner.classList.add("hidden");
        }
      });
  });
})();
