function shareContent() {
    const graphLink = copyDoc();
    const data = {
        title: "BetterIB EXPgrapher",
        text: "Link to a graph",
        url: graphLink, 
    };
  
    if (navigator.share) {
      navigator
        .share(data)
        .then(() => console.log("Successfully shared!"))
        .catch((error) => console.error("Error sharing:", error));
    } else {
      console.log("Web Share API not supported.");
      if (navigator.clipboard) {
          navigator.clipboard.writeText(graphLink)
              .then(() => console.log("URL copied to clipboard!"))
              .catch((error) => console.error("Error copying to clipboard:", error));
      } else {
          console.error("Clipboard API not supported.");
      }
    }
}
if (!navigator.share) {
  document.getElementById("appleShareButton").style.display = "none"; // Hide the apple share button if the Apple Web Share API is not supported
}
else{
  document.getElementById("linkShareButton").style.display = "none"; // Hide the link share button if the API is supported
}  