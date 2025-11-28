if (typeof window !== "undefined") {
  const bugscribe = new Bugscribe({
    button: {
      position: {
        vertical: "bottom",
        horizontal: "right",
      },
      bgColor: "#ff5733",
    },
    screenshot: {
      defaultShape: "rectangle", // "rectangle", "ellipse", or "freeform"
      dimensionsPosition: "center", // false, "center", "right-bottom", "right-top", "left-bottom", "left-top"
    },
  });

  window.bugscribe = bugscribe;
}
