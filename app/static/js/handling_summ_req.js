function handling_summ_req(paragraph, url) {
    if (!paragraph) {
        createFlashMessage(flashMessagesTypes.error, "no paragraph to summarize")
    } else {
        document.getElementById('modal-content').innerText =" summarizing :)";
        fetch(`${url}/summarized_text`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ paragraph: paragraph }),
        }).then(response => {
            // Check if the response is successful
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            // Parse the JSON from the response
            return response.json();
        })
            .then(data => {
                // Display the summarized text in the HTML
                document.getElementById('modal-content').innerText = data.summarization;
            })
            .catch(error => {
                // Handle any errors
                console.error('There has been a problem with your fetch operation:', error);
                createFlashMessage(flashMessagesTypes.error, "Can't generate summarization now, try again lter.")
            });
    }
}