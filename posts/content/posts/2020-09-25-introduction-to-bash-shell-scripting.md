---
title: "Introduction to Bash Shell Scripting"
date: 2020-09-25
url: /introduction-to-bash-shell-scripting
toc: false
draft: false
images:
tags:
  - RHEL
  - Bash
  - Shell
  - Scripting
---

{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}
{{< image src="/img/bash_logo.png" alt="Bash logo" position="center" style="width:150px">}}


# Core Elements

A shell script is a list of sequentially executed commands with optional scripting logic to allow code to be executed under specific conditions only. Starting a script from the parent shell opens a subshell from where the commands in the script are executed. These commands can be interpreted in different ways, to make it clear how they should be interpreted the *shebang* is used on the first line of the script: `#!/bin/bash`, which would call and execute the script in a bash subshell. 


The below script asks you for a path and stores the path in the `DIR` variable, then changes directory to the `DIR` value and prints the current working directory.
```
#!/bin/bash
# MyComment

echo Provide a path to a directory:
read DIR
cd $DIR
pwd
exit 0
```
When you execute this script, notice how your current working directory hasn't changed after the script has executed. This is because the script executes in a subshell of the parent shell from where you invoked the script.

At the end of the above script an `exit 0` statement is included. An exit statement tells the parent script whether the scipt was successful, a `0` means it was successfull, while anything else means a problem was encountered. 

A script needs to be executable. The most common way to make a script executable is by applying the execute permission to it. The script can also be executed as an argument to the `bash` command, e.g. `bash myscript.sh`. 

You can store a script anywhere you like, but if it's stored outide of the `$PATH` you need to execute it with a `./` in front: `./myscript.sh`.

# Variables and Input
Scripts typically aren't a list of sequential commands, they can work with variables and input to be more flexible.


## Positional Parameters
When starting a script, an argument can be used. Arguments are anything you put behind the command while starting the script, e.g. `useradd lisa` where the command is `useradd` and the argument is `lisa`. In a script, the first variable is referred to as `$1`, the second as `$2` and so on. 

```
#!/bin/bash
# Run this script with a few arguments

echo The first argument is $1
echo The 2nd argument is $2
echo The 3rd argument is $3
```

Run the above script with a few arguments, and it will make sense:
`./script 1 2 3 4`
You'll notice the 4th argument, being `4` isn't echoed. We can work around that by making the script more flexible using a conditional `for` loop instead of echoeing each argument one after the other:

```
#!/bin/bash
# Run this script with a few arguments

echo You have entered $# arguments.

for i in "$@"
  do echo $i
done

exit 0
```

`$#` is a counter that shows how many arguments were used when starting the script.  
`$@` refers to all arguments used when starting the script. 
In the above script, the condition is `for i in "$@"`, which means "for each argument in the list of arguments". I'll cover more on `for` loops later, but what this script basically does is loop through the list of arguments (`$@`) and echo each one (`do echo $i`). 

## Variables

Variables are labels that refer to a specific location in memory which contains a specific value. They can be defined statically or dynamically. Variables are defined by using the `=` sign directly after the uppercase name, followed by the value. You should never use spaces when defining variables:  
`MYVAR=value`, this would be a statically defined variable.

There are two solutions for defining variables dynamically:
* Using `read` in the script to ask the user for input. IT stops the script so input can be processed and stored in a variable:  
```
[joeri@Ryzen7 ~]$ read NAME
joeri
[joeri@Ryzen7 ~]$ echo $NAME
joeri
```
* Using command substitution where you assign the result of a specific command to a variable. For example: `TODAY=$(date +%d-%m-%y)`.  
You enclose the command whose result you want to use between parentheses and preceed that with a `$` sign.  
```
[joeri@Ryzen7 ~]$ TODAY=$(date +%d-%m-%y)
[joeri@Ryzen7 ~]$ echo $TODAY
31-10-20
```

# Conditional Loops

Conditional loops are executed only if a certain condition is true. I'll cover the most often used conditional loops in this section.

## if ... then ... else
This construction is common to evaluate specific conditions and are often used together with the `test` command. Have a look at the man page of `test` for a complete overview of all the functionality.

Let's look at an example:
```
#!/bin/bash
# MyComment

if [ -z $1 ]
then
  echo No value provided
fi
```

The  `-z` test command checks if the length of a string is zero (`man test`). If that is true, then "No value provided" will be echoed to the screen.
The above script will only provide output if you run it without any argument.

Below is another example using multiple test commands:
```
#!/bin/bash
# Run this script with one argument.
# Find out if the argument is a file or a directory

if [ -f $1 ]
then
  echo "$1 is a file"
elif [ -d $1 ]
then
  echo "$1 is a directory"
else
  echo "Not sure what $1 is...."
fi

exit 0
```

## || and &&
Instead of writing full `if ... then` statements we can use logical operators. `||` is a logical OR and will execute the second part of the statement only if the first part is *not* true. `&&` is a logical AND, and will execute the second part of the statement only if the first part *is* true.
"true" is the state where a command exits with a `0`. 

```
[ -z $1 ] && echo no argument provided
ping -c 1 192.168.1.256 || echo node does not exist
```

## For ... do ... done
The `for` conditional loop provides a solution for processing ranges of data. It always starts with `for` followed by the condition, then `do` followed by the commands to be executed when the condition is true, and finally closed with `done`.

In the below example the COUNTER variable is initialized with a value of 10, if the value is greater than or equal to 0 we substract 1. As long as this condition is true we then echo the value of COUNTER:

```
#!/bin/bash
#

for (( COUNTER=10; COUNTER>=0; COUNTER--))
do
  echo $COUNTER
done
exit 0

```

We can also define a range by specifying the first number followed by two dots and closing with the last number in the range:
```
[joeri@Ryzen7 ~]$ for i in {85..90}; do ping -c 1 192.168.100.$i >/dev/null && echo 192.168.100.$i is UP; done
192.168.100.88 is UP
```

With `for i in` each of the numbers in the range is assigned to the variable `i`. For each of those values the `ping -c 1` command is executed, and output is redirected to `/dev/null` since we don't need it. Based on the exit status of the `ping` command, `exit 0` or `true`, the part behind the logical operator `&&` is executed.



## While and until
The `while` statement is useful if you want to do something as long as a condition is true. Its counterpart is `until` which keeps the iteration open as long as the condition is false, or until the condition is true.

The below script initializes the COUNTER value with a value of 0 and *while* the value is *less than* 11 we echo the value and increase the value with 1:

```
#!/bin/bash
#

COUNTER=0

while [ $COUNTER -lt 11 ]; do
  echo The counter is $COUNTER
  (( COUNTER=COUNTER+1 ))
done
```

Below we echo the value of COUNTER and increase its value with 1 *until* the value is equal to 11. At that point we break out of the loop:

```
#!/bin/bash
#

COUNTER=0

until [ $COUNTER = 11 ]; do
  echo The counter is $COUNTER
  (( COUNTER=COUNTER+1 ))
done
```


## Case
The `case` statement is used to evaluate a number of expected values, you define very specific argument that you expect followed by the command that needs to be executed if that argument was used.  

The generic syntax is `case item-to-evaluate in`, followed by a list of all possible values that need to be evaluated. Each item is closed with a `)`. Then follows a list of commands that are executed if the specific argument was used, the commands are closed with a double semicolon, `;;`.   

The evaluations in `case` are performed in order. Then the first match is made, the `case` statement will not evaluate anything else. Whitin the evaluaten, wildcard-like patterns can be used. For example `*)`, which is a "catchall" statement.

```
#!/bin/bash

echo -n "Enter the name of a country: "
read COUNTRY

echo -n "The official language of $COUNTRY is "

case $COUNTRY in

  Lithuania)
    echo -n "Lithuanian"
    ;;

  Romania | Moldova)
    echo -n "Romanian"
    ;;

  Italy | "San Marino" | Switzerland | "Vatican City")
    echo -n "Italian"
    ;;

  *)
    echo -n "unknown"
    ;;
esac
```



# Script debugging

If a script does not do what you expect it to do, try starting it as an argument to the `bash -x` command. This will show you line by line what the script is trying to do and will show specific errors if it does not work. 


```
[joeri@Ryzen7 ~]$ bash -x lang.sh 
+ echo -n 'Enter the name of a country: '
Enter the name of a country: + read COUNTRY
Germany
+ echo -n 'The official language of Germany is '
The official language of Germany is + case $COUNTRY in
+ echo -n unknown
unknown
```

