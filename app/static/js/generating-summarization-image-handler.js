async function handleGenerateSummarizationImage(subtopicTitle, url) {
    let summarizationImage = document.getElementById('summarization-image');
    await fetch(`${url}/generate-summarization-image`, {
        method: "POST",
        body: JSON.stringify({
          "summary": subtopicTitle
        }),
        headers: {
          "Content-Type": "application/json",
        }
    }).then(res => {
        if (!res.ok) {throw Error();}  
        
        return res.json();
    })
    .then((res) => {
        console.log(res);
        summarizationImage.src = res.url;
        summarizationImageLoadingSpinner.classList.add('d-none');
        summarizationImageContainer.classList.remove('d-none');
    })
    .catch(err => {
        console.log(err)
        createFlashMessage(flashMessagesTypes.error, "Can't generate image now, try again lter.")
        summarizationImageLoadingSpinner.classList.add('d-none');
        summarizationImageContainer.classList.remove('d-none');
    })
}
