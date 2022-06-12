---
title: "Dev"
date: 2020-03-06T07:14:01+00:00
type: page
draft: false
---

### Cloudflare DNS Updater
{{< image src="/img/icons8-python-64.png" alt="Python Logo" position="center">}}

An alternative to popular Dynamic DNS providers like noip.com or dyno.com.
It fetches the current public IP address for the host it is run on from ipify.org and sets that IP address as a value
for a DNS record in Cloudflare DNS, if the values do not match.
An email notification is sent via Sendgrid when a domain is updated or when an error occurs.
[https://gitlab.com/joerismissaert/public-ip](https://gitlab.com/joerismissaert/public-ip)

___

### Dino Run!
{{< image src="/img/icons8-python-64.png" alt="Python Logo" position="center">}}


An attempt at better understanding Object Oriented Programming by making a platform game with PyGame.
[https://gitlab.com/joerismissaert/dino-run](https://gitlab.com/joerismissaert/dino-run)

___


### GnomePaper GUI
{{< image src="/img/icons8-python-64.png" alt="Python Logo" position="center">}}


A fork of the GnomePaper application refactored with a Graphical User Interface using PySimpleGUI. 
[https://gitlab.com/joerismissaert/gnomepaper-gui](https://gitlab.com/joerismissaert/gnomepaper-gui)

___

### GnomePaper 
{{< image src="/img/icons8-python-64.png" alt="Python Logo" position="center">}}


A Python script that downloads an image from Unsplash based on the provided resolution and keywords, then sets that image as the Gnome wallpaper. Uses Systemd service and timer units. 
[https://gitlab.com/joerismissaert/gnomepaper](https://gitlab.com/joerismissaert/gnomepaper)

___

### TarTUI
{{< image src="/img/icons8-python-64.png" alt="Python Logo" position="center">}}

A Text-based User Interface for the tar utility which allows you to create new archives using no compression, or using gzip, bz2 or lzma compression.  
[https://gitlab.com/joerismissaert/tar-tui](https://gitlab.com/joerismissaert/tar-tui)
___

### kDig
{{< image src="/img/bash_logo.png" alt="Bash Logo" position="center" style="width: 64px;">}}


Created to facilitate my day to day job, this script uses the dig, whois, and cURL utilities to find out information about a domain and IP address.  
[https://gitlab.com/joerismissaert/kdig](https://gitlab.com/joerismissaert/kdig)
___

### Kinsta Nginx Log Parser 
{{< image src="/img/bash_logo.png" alt="Bash Logo" position="center" style="width: 64px;">}}


This script parses a Kinsta Nginx access.log file.  
[https://gitlab.com/joerismissaert/kinsta-log-parser](https://gitlab.com/joerismissaert/kinsta-log-parser)
___

### Dupe Detect 
{{< image src="/img/icons8-python-64.png" alt="Python Logo" position="center">}}


This script will traverse a given path recursively and create a list of duplicate files based on the blake2b hash of the file + the blake2b hash of the filesize.  
[https://gitlab.com/joerismissaert/dupe-detect](https://gitlab.com/joerismissaert/dupe-detect)
___

### Website Backup Script 
{{< image src="/img/icons8-python-64.png" alt="Python Logo" position="center">}}

This script will backup all websites it finds inside the base directory of a webserver.
MySQL databases will be dumped and backed up as well. All backed up files are kept locally as well as uploaded to a Google Cloud Storage Bucket. The retention policy for both locations is 7 days.  
[https://gitlab.com/joerismissaert/websites-backup-script](https://gitlab.com/joerismissaert/websites-backup-script)
___

### Nginx Log Parser 
{{< image src="/img/icons8-python-64.png" alt="Python Logo" position="center">}}


A script to parse and email a custom Nginx access log.  
[https://gitlab.com/joerismissaert/nginx-parser](https://gitlab.com/joerismissaert/nginx-parser)
___


### Downloads Cleaner 
{{< image src="/img/icons8-python-64.png" alt="Python Logo" position="center">}}


This application checks a user-provided path for files and folders older than 7 days. Those files and folders are deleted, a report is generated and emailed to a user-provided destination address
[https://gitlab.com/joerismissaert/dowloads-cleaner](https://gitlab.com/joerismissaert/dowloads-cleaner)
