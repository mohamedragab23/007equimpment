# -*- coding: utf-8 -*-
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import openpyxl
path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'سيستم معدات 007.xlsx')
if os.path.isfile(path):
    wb = openpyxl.load_workbook(path, read_only=True)
    print('Sheet names:', wb.sheetnames)
    wb.close()
else:
    print('File not found:', path)
