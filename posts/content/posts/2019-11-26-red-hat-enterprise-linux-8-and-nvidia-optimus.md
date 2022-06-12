---
title: Red Hat Enterprise Linux 8 and Nvidia Optimus
author: Joeri
date: 2019-11-26T06:37:47+00:00
excerpt: My laptop uses the Nvidia Optimus technology to seamlessly switch between the integrated Intel GPU and the Nvidia discrete graphics. I couldn’t get it to work with the default opensource nouveau drivers, so I went ahead and installed the non-free Nvidia proprietary drivers.
url: /red-hat-enterprise-linux-8-and-nvidia-optimus/
swp_cache_timestamp:
  - 442844
categories:
  - CentOS
  - Red Hat Enterprise Linux
tags:
  - CentOS
  - dual display
  - external monitor
  - Linux
  - Nvidia
  - Red Hat

---
{{< image src="/img/redhat-8-logo.png" alt="Red Hat Logo" position="center">}}


Yesterday I decided to go ahead and install RHEL8 on my laptop and use it as my everyday workstation as well as a learning platform to move forward on my Red Hat certification path. 

In case you're interested, you can actually use RHEL for free with a [No-Cost RHEL Developer Subscription](https://developers.redhat.com/blog/2016/03/31/no-cost-rhel-developer-subscription-now-available/) as long as you don't use the machine "in production". 

After a pretty straightforward installation of RHEL 8 I was immediately confronted with a first issue. My external HDMI monitor wasn't detected.  
  
My laptop uses the Nvidia Optimus technology to seamlessly switch between the integrated Intel GPU and the Nvidia discrete graphics. I couldn't get it to work with the default opensource _nouveau_ drivers, so I went ahead and installed the non-free Nvidia proprietary drivers.  
  
By default, RHEL installs the (newer) Wayland display server, but the Nvidia drivers don't seem to work with those so I had to switch to Xorg. Either way, I didn't mind since the Nvidia drivers offer better performance. 

## Installing the non-free Nvidia drivers on RHEL 8

The _nouveau_ kernel module should be blacklisted first, to prevent it from loading during the next boot:

```
# echo 'blacklist nouveau' >> /etc/modprobe.d/blacklist.conf
```

The next step will be to install the Xorg display server and the kernel development tools:

```
# dnf groupinstall "base-x" "Legacy X Window System Compatibility" "Development Tools"
# dnf install elfutils-libelf-devel "kernel-devel-uname-r == $(uname -r)"
```

Backup and rebuild the _initramfs:_

```
# mv /boot/initramfs-$(uname -r).img /boot/initramfs-$(uname -r)-nouveau.img
# dracut -f
```

Make sure you have Dynamic Kernel Module Support installed. This will automatically rebuild the Nvidia kernel modules when you update the kernel, so you won't have to reinstall them afterward.

```
# dnf install dkms
```

Download the Nvidia drivers from https://www.nvidia.com/

Change the default runlevel:

```
# systemctl set-default multi-user.target
```

Reboot your system and install the driver: 

```
# chmod +x NVIDIA-$version.run
# ./NVIDIA-$version.run 
```

Test the new driver by switching to the _graphical.target_ runlevel:

```
# systemctl isolate graphical.target 
```

Correct the default runlevel:

```
# systemctl set-default graphical.target
```

## Configuring Xorg

First, search for your hardware and take note of the PCI bus it's operating on. The PCI bus for my Intel GPU is _00:02.0_ and for my Nvidia GPU _01:00.0._

```
# lspci | grep -EA1 'VGA|3D'
00:02.0 VGA compatible controller: Intel Corporation UHD Graphics 630 (Mobile)
01:00.0 3D controller: NVIDIA Corporation GP107M &#91;GeForce GTX 1050 Ti Mobile] (rev a1)
```

Next, if you have an existing Xorg configuration (_/etc/X11/xorg.conf)_, make a backup, then replace the existing config with the below. Make sure you modify the BusID's. 

```
Section "ServerLayout"
    Identifier "layout"
    Screen 0 "nvidia"
    Inactive "intel"
EndSection

Section "Device"
    Identifier "nvidia"
    Driver "nvidia"
    BusID "PCI:01:00:0"
EndSection

Section "Screen"
    Identifier "nvidia"
    Device "nvidia"
    Option "AllowEmptyInitialConfiguration"
EndSection

Section "Device"
    Identifier "intel"
    Driver "modesetting"
    BusID "PCI:00:2:0"
EndSection

Section "Screen"
    Identifier "intel"
    Device "intel"
EndSection
```

The last steps consist of autostarting the dual-display configuration using `xrandr`. Execute `nano /etc/xdg/autostart/nvidia-optimus.desktop` and add the following lines :

```
[Desktop Entry]
Type=Application
Name=NVIDIA Optimus
Exec=sh -c "xrandr --setprovideroutputsource modesetting NVIDIA-0; xrandr --auto"
NoDisplay=true
X-GNOME-Autostart-Phase=DisplayServer
```

Copy the same file to `/usr/share/gdm/greeter/autostart/nvidia-optimus.desktop`.

You should now have a working dual display after logging out and logging back in or rebooting!