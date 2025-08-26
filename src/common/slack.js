const fetch = require("node-fetch");


// call slack function. takes method(str), request_type(str), body if necessary
async function call_slack(method, )
const result = await fetch("https://slack.com/api/" + "users.profile.get", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
            "Authorization": "Bearer " + process.env.SLACK_USER_TOKEN,
        }
    });

    const data = await result.json();

    if (!data.ok) {
        console.log(data);
        res.redirect("/500");
        return true;
    } 

    return data;
fasdf