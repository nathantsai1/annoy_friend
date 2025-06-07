# ANNOY-FRIEND

## What is this?
This is a project that uses node.js to help users annoy their friend by sending automated emails that tell their friend whatever the user wants to tell their friend. Note that there should be a part where the user must input their email so that this API can send emails from this. 
## How does this work?
There will be a website where you can sign up /login and then create an email log. You will get a max of 10 different emails that would automatically be sent. 
## How to set up
Sign up [here](https://annoy-friend.onrender.com/)! Then go to the "my emails" tab and go add a new one
## APIs used
GMAIL API

## How do I run this myself?
Currently, I did not have enough time to make this tutorial before, but simply put:
1. Fork this repository
2. Create a google project with scopes ["https://annoy-friend.onrender.com/oauth2callback/login", "https://annoy-friend.onrender.com/oauth2callback/signup"], and download the client id/secret, renaming it oauth2.keys.json and putting it in the main folder
3. Delete ./src/common/neon.js
4. Deploy this node.js to a website like Render. Remember to store your env variables correctly!