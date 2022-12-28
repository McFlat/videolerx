VIDEOLERX
=========

Downloads videos and uploads them to S3.

How to install

    npm install -g videolerx
    
Create a config file

    videolerx init
    
Download videos from a jsonlines file which has some videos, using default config file

    videolerx 2017.json
    videolerx 2017.json 2016.json 2015.json
    
Download video using a url or video id
    
    videolerx https://www.youtube.com/watch?v=dQw4w9WgXcQ
    videolerx dQw4w9WgXcQ
    
Download videos using a mixture of video urls and files or json that contain video urls

    videolerx 2017.json https://www.youtube.com/watch?v=dQw4w9WgXcQ

Specify config file to use

    videolerx -c config.txt 2017.json
