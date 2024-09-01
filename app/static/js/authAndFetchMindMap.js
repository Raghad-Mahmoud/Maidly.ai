document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    console.log('Retrieved token:', token);  // Log the token to check if it's retrieved correctly

    if (token) {
        fetch('/mindMap', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
        .then(response => {
            console.log('Response status:', response.status);  // Log response status
            console.log('Response headers:', response.headers);  // Log response headers

            if (response.ok) {
                return response.json();
            } else {
                return response.text().then(text => {
                    console.error('Response text:', text);  // Log response text for debugging
                    throw new Error('Unauthorized access. Please sign in again.');
                });
            }
        })
        .then(data => {
            console.log('Response data:', data);  // Log the response data
            // Handle the data as needed
        })
        .catch(error => console.error('Network error:', error));
    } else {
        alert('Please sign in to access this page.');
        window.location.href = '/signin';
    }
});
