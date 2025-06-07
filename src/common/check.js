// check if email is right;

async function checkEmail(email) {
    myHeaders = new Headers();
    myHeaders.append("apikey", "I3zrv5k6YjPnpKgnlKfKqbPQgrGY7IiF");

    var requestOptions = {
    method: 'GET',
    redirect: 'follow',
    headers: myHeaders
    };
    const new_email = encodeURIComponent(email);
    const result = await fetch(`https://api.apilayer.com/email_verification/check?email=${new_email}`, requestOptions)
    .then(response => response.text())
    .catch(error => console.log('error', error));
    return result;
}

module.exports = { checkEmail };