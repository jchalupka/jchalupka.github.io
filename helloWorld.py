#!/usr/bin/env python
# This Python file uses the following encoding: utf-8
import os,sys

for i in range(1,60):


    if i%2:
        for j in range(1,50):
            if j%2:
                sys.stdout.write("⎺\\")
            else:
                sys.stdout.write("/\\")

    else:
        for j in range(1,50):
            if j%2:
                sys.stdout.write("⎺/")
            else:
                sys.stdout.write("\\/")

    sys.stdout.write("\n")
