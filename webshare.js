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
if (!navigator.share) {
  document.getElementById("appleShareButton").style.display = "none"; // Hide the apple share button if the Apple Web Share API is not supported
}
else{
  document.getElementById("linkShareButton").style.display = "none"; // Hide the link share button if the API is supported
}