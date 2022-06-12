---
title: "Managing Storage: Understanding MBR and GPT Partitions"
date: 2020-07-28T17:45:50+04:00
url: /managing-storage-understanding-mbr-and-gpt-partitions
draft: false
toc: false
tags:
  - RHEL
  - Storage
  - Partitions
  - MBR
  - GPT
---

{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}


If a mass storage device is connected to a Linux computer, the Linux kernel tries to locate any partitions. So to use a hard drive we need to partition it. On RHEL 8 two different partitioning schemes are available: the Master Boot Record and GUID Partition Table. Linux typically has multiple partitions on one hard disk, this makes sense for different reasons:
* Distinguish different types of data.
* Mount options to enhance security or performance.
* Create backup strategies where only relevant portions of the OS are backed up.
* If one partition accidentally fills up completely other partitions are still usable and your system might not crash immediately.


## The MBR Partitioning Scheme

In the early 1980s the Master Boot Record partitioning scheme was invented to define hard disk layout.
On BIOS-based systems the BIOS searches for an operating system on the bootable disk device where the first 512 bytes of the boot medium is read. The MBR is defined as these first 512 bytes which contains an operating system boot loader (446 bytes) and a partition table (64 bytes). The size used for the partition table, means no more than 4 partions can be created with a maximum size of 2 TiB per partition. The last 2 bytes (0x55, 0xaa) of the first 512 byte sector signifies the device is bootable. These two bytes are also call the "magic number".

To go beyond the limit of 4 partitions, one partition could be created as an extended partition (as opposed to a primary partition) where multiple logical partitions can be created within to reach a total of 15 partitions addressable by the Linux kernel.

{{< image src="/img/MBR.png" alt="Master Boot Record" position="center" >}}


## The GPT Partitioning Scheme

Current hard drives have become too big to be addressed by MBR partitions, the GUID Partition Table counters this. On computers that use the new Unified Extensible Firware Interface (UEFI) instead of BIOS, GPT partitions are the only way to address disks. Systems using BIOS can use GUID partitions and must do so if a disk bigger than 2 TiB needs to be addressed. Although not being used by UEFI devices, the MBR is present at the beginning of the disk, in block LBA0, for protective and compatibility purposes. Strictly speaking, the GPT starts up from the Partition Table Header.

The benefits of using GUID:
* a 8 ZiB partition size (1024^4).
* Maximum 128 partitions.
* No distinguishment between primary, extended and logical partitions.
* Uses 128-bit global unique identifier (GUID) to identify partitions.
* A backup of the GUID partition table is created at the end of the disk (Secondary GPT Header), eliminating the single point of failure of MBR partition tables.

{{< image src="/img/GPT.png" alt="GUID Partition Table Scheme" position="center" >}}


## Storage Measurement Units
Different measurement units can be used, we typically differentiate between binary (power of 2) and decimal (power of 10) measurement units. Decimal units use a multiple of 1,000 bytes while binary units use a multiple of 1,024 bytes.

When speaking of partitions using binary units, the starting point of the partition is aligned to the exact sector specified by size and the ending point is aligned to the specified size minus 1 sector.
If using decimal units, the starting and ending point is aligned within one half of the specified unit: for example, ±500KB when using the MB suffix.

In computers it makes sense to use binary units because that's how computers address items, the binary unit has become the standard on current Linux distribution although some utilities may provide their output in decimal units. 

{{<table "table table-dark table-striped table-bordered">}}
Symbol | Name | Value | Symbol | Name | Value 
-------|------|-------|--------|------|------
KB | Kilobyte | 1000^1 | KiB | Kibibyte | 1024^1
MB | Megabyte | 1000^2 | KiB | Mebibyte | 1024^2
GB | Gigabyte | 1000^3 | KiB | Gibibyte | 1024^4
TB | Terabyte | 1000^4 | KiB | Tebibyte | 1024^5
PB | Petabyte | 1000^5 | KiB | Pebibyte | 1024^6
EB | Exabyte | 1000^6 | KiB | Exbibyte| 1024^7
ZB | Zettabyte | 1000^7 | KiB | Zebibyte | 1024^8
YB | Yottabyte | 1000^8 | KiB | Yobibyte | 1024^9
{{</table>}}
