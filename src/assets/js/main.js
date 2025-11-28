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
      dimensionsPosition: "center", // false, "center", "right-bottom", "right-top", "left-bottom", "left-top"
    },
  });

  window.bugscribe = bugscribe;
}
