# Skype Connector UCWA

Let bots developed by any chat-based API connect to Skype For Business Server (Lync) on premise version 2013. Use UCWA API.

## Author

Tuan DUNG HOANG Orange IMT/OLS/CCMB/SPRINT/WRP.

## Status of the code

**What it does?**

The current code (as found in the "POC" directory) is a proof of concept. It shows whether or not it can connect a chatbot to the Skype for Business Server (Lync 2013) on premise instance in Orange. It does. The code has been demonstrated using my own Lync 2013 account and another account I borrowed from Lync 2013 maintainer team in Orange (for security reasons, I can't share these credentials with you).

In this demo, I used specific tools branded by Orange, but feel free to use yours:
* [Chatbot API](https://bots.nectarine.ai/#/login): Smartly, commercialized under Orange ODIN brand.
* [Database cloud service](https://datasync.orange.com/doc/Webcom.html): Flexible Datasync, which is a NOSQL database on the cloud with publish/subscribe feature. 

The services I listed above can bill you if you surpass a certain level of quota.

**Documentation**

The code doesn't have **yet** a documentation telling step by step to understand what to do to take over this code. While waiting, you can follow the following guides - these guides have been used by me to develop this code, so you should be fine as long as your on premise instance of Skype is Lync 2013:
* [Smartly chatbot API, commercialized under Orange ODIN brand](http://docs.smartly.ai/)
* [How to create the first batch of API requests to create an application (a concept in Skype)](https://msdn.microsoft.com/en-us/skype/ucwa/createanapplication). [Backup link](https://www.matthewproctor.com/Send-An-IM-With-UCWA-Creating-the-Application/).
* [What is an "application"?](https://msdn.microsoft.com/en-us/skype/ucwa/applications_ref)
* [How to send a message](https://www.matthewproctor.com/Send-An-IM-With-UCWA-Sending-the-IM/). [Backup link](https://msdn.microsoft.com/en-us/skype/ucwa/sendanim).
* [How to receive a message](https://msdn.microsoft.com/en-us/skype/ucwa/receiveanim). [Backup link](https://msdn.microsoft.com/skype/ucwa/CreateAnApplication)

**Flaws**

The flaw of this code is that in order to initiate a conversation between an user and a chatbot, the only available method as of now is to let the chatbot initiate a conversation with the user - with condition: the bot should know that user's email (Eg. foo.bar@orange.com in my case) beforehand. The desired behavior should instead be: Any user can search for the bot in Skype's contact list (you must know the bot's Skype contact beforehand), send it a message, and voilà, the bot is awaken and it will talk back to you!

## TODO's
* Add step-by-step documentation to help people understand how to use this code. Estimated September.
* Develop missing features: initiate conversation properly (as seen in Flaws section).
