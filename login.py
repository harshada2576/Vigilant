# -*- coding: utf-8 -*-

# Form implementation generated from reading ui file 'login.ui'
# Created by: PyQt5 UI code generator 5.15.11

from PyQt5 import QtCore, QtGui, QtWidgets
import resources_rc  # ✅ Import the compiled resource file

class Ui_window(object):
    def setupUi(self, window):
        window.setObjectName("window")
        window.resize(931, 722)
        window.setMaximumSize(QtCore.QSize(931, 722))
        window.setStyleSheet("border:1 solid;\nborder-color: rgb(59, 59, 59);")

        self.frame = QtWidgets.QFrame(window)
        self.frame.setGeometry(QtCore.QRect(10, 10, 911, 701))
        self.frame.setAutoFillBackground(False)
        self.frame.setStyleSheet("background-color: rgb(255, 170, 255);")
        self.frame.setFrameShape(QtWidgets.QFrame.StyledPanel)
        self.frame.setFrameShadow(QtWidgets.QFrame.Raised)
        self.frame.setObjectName("frame")

        self.pushButton = QtWidgets.QPushButton(self.frame)
        self.pushButton.setGeometry(QtCore.QRect(270, 20, 351, 171))
        self.pushButton.setStyleSheet("border:0;border-radius:5;")
        self.pushButton.setText("")
        icon = QtGui.QIcon()
        icon.addPixmap(QtGui.QPixmap(":/login.webp"), QtGui.QIcon.Selected, QtGui.QIcon.On)  # ✅ Use resource path
        self.pushButton.setIcon(icon)
        self.pushButton.setIconSize(QtCore.QSize(150, 150))
        self.pushButton.setObjectName("pushButton")

        self.scrollArea = QtWidgets.QScrollArea(self.frame)
        self.scrollArea.setGeometry(QtCore.QRect(90, 290, 761, 361))
        self.scrollArea.setStyleSheet("border:1 solid;\nborder-color: rgb(255, 0, 255);")
        self.scrollArea.setWidgetResizable(True)
        self.scrollArea.setObjectName("scrollArea")

        self.scrollAreaWidgetContents = QtWidgets.QWidget()
        self.scrollAreaWidgetContents.setGeometry(QtCore.QRect(0, 0, 759, 359))
        self.scrollAreaWidgetContents.setObjectName("scrollAreaWidgetContents")

        self.label = QtWidgets.QLabel(self.scrollAreaWidgetContents)
        self.label.setGeometry(QtCore.QRect(90, 60, 550, 50))
        font = QtGui.QFont()
        font.setPointSize(17)
        self.label.setFont(font)
        self.label.setStyleSheet("background-color: rgb(255, 85, 255);")
        self.label.setObjectName("label")

        self.label_2 = QtWidgets.QLabel(self.scrollAreaWidgetContents)
        self.label_2.setGeometry(QtCore.QRect(90, 160, 550, 50))
        self.label_2.setFont(font)
        self.label_2.setStyleSheet("background-color: rgb(255, 85, 255);")
        self.label_2.setObjectName("label_2")

        self.lineEdit = QtWidgets.QLineEdit(self.scrollAreaWidgetContents)
        self.lineEdit.setGeometry(QtCore.QRect(260, 60, 381, 50))
        self.lineEdit.setStyleSheet("background-color: rgb(255, 255, 255);\nborder-color: rgb(255, 255, 127);")
        self.lineEdit.setEchoMode(QtWidgets.QLineEdit.PasswordEchoOnEdit)
        self.lineEdit.setObjectName("lineEdit")

        self.lineEdit_2 = QtWidgets.QLineEdit(self.scrollAreaWidgetContents)
        self.lineEdit_2.setGeometry(QtCore.QRect(260, 160, 381, 50))
        self.lineEdit_2.setStyleSheet("background-color: rgb(255, 255, 255);\nborder-color: rgb(255, 255, 127);")
        self.lineEdit_2.setEchoMode(QtWidgets.QLineEdit.PasswordEchoOnEdit)
        self.lineEdit_2.setObjectName("lineEdit_2")

        self.pushButton_2 = QtWidgets.QPushButton(self.scrollAreaWidgetContents)
        self.pushButton_2.setGeometry(QtCore.QRect(330, 250, 121, 51))
        font.setPointSize(17)
        font.setBold(False)
        font.setWeight(50)
        self.pushButton_2.setFont(font)
        self.pushButton_2.setStyleSheet("border-radius:7;\nborder-color: rgb(0, 0, 0);\nbackground-color: rgb(0, 170, 0);\nborder: 2 solid;")
        self.pushButton_2.setObjectName("pushButton_2")

        self.label_3 = QtWidgets.QLabel(self.scrollAreaWidgetContents)
        self.label_3.setGeometry(QtCore.QRect(30, 300, 131, 21))
        font.setPointSize(10)
        self.label_3.setFont(font)
        self.label_3.setStyleSheet("border:0;")
        self.label_3.setObjectName("label_3")

        self.label_4 = QtWidgets.QLabel(self.scrollAreaWidgetContents)
        self.label_4.setGeometry(QtCore.QRect(510, 300, 191, 21))
        self.label_4.setFont(font)
        self.label_4.setStyleSheet("border:0;")
        self.label_4.setObjectName("label_4")

        self.scrollArea.setWidget(self.scrollAreaWidgetContents)

        self.label_5 = QtWidgets.QLabel(self.frame)
        self.label_5.setGeometry(QtCore.QRect(250, 210, 421, 51))
        font.setPointSize(20)
        font.setBold(True)
        font.setWeight(75)
        self.label_5.setFont(font)
        self.label_5.setStyleSheet("border:0;")
        self.label_5.setAlignment(QtCore.Qt.AlignCenter)
        self.label_5.setIndent(5)
        self.label_5.setObjectName("label_5")

        self.retranslateUi(window)
        QtCore.QMetaObject.connectSlotsByName(window)

    def retranslateUi(self, window):
        _translate = QtCore.QCoreApplication.translate
        window.setWindowTitle(_translate("window", "Login"))
        self.label.setText(_translate("window", "Username"))
        self.label_2.setText(_translate("window", "Password"))
        self.lineEdit.setPlaceholderText(_translate("window", "Enter Your Username/Email"))
        self.lineEdit_2.setPlaceholderText(_translate("window", "Enter Your Password"))
        self.pushButton_2.setText(_translate("window", "Login"))
        self.label_3.setText(_translate("window", "Forgot Password?"))
        self.label_4.setText(_translate("window", "New User? Register Now"))
        self.label_5.setText(_translate("window", "WELCOME BACK"))

if __name__ == "__main__":
    import sys
    app = QtWidgets.QApplication(sys.argv)
    window = QtWidgets.QWidget()
    ui = Ui_window()
    ui.setupUi(window)
    window.show()
    sys.exit(app.exec_())