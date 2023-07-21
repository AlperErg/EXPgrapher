function shareContent() {
    const data = {
        title: "BetterIB EXPgrapher",
        text: "Link to a graph",
        url: copyDoc, //not working at the moment maybe transfer this code to index html
    };
  
    if (navigator.share) {
      navigator
        .share(data)
        .then(() => console.log("Successfully shared!"))
        .catch((error) => console.error("Error sharing:", error));
    } else {
      console.error("Web Share API not supported.");
    }
  }
  