# -*- coding: utf-8 -*-

from PyQt5 import QtCore, QtGui, QtWidgets
import resources_rc  # ✅ Ensure this is compiled from your .qrc file

class Ui_window(object):
    def setupUi(self, window):
        window.setObjectName("window")
        window.resize(931, 722)
        window.setMaximumSize(QtCore.QSize(931, 722))
        window.setStyleSheet("background-color: #F5F7FA; border: none;")

        self.frame = QtWidgets.QFrame(window)
        self.frame.setGeometry(QtCore.QRect(10, 10, 911, 701))
        self.frame.setStyleSheet("background-color: #F5F7FA; border: none;")
        self.frame.setFrameShape(QtWidgets.QFrame.StyledPanel)
        self.frame.setFrameShadow(QtWidgets.QFrame.Raised)
        self.frame.setObjectName("frame")

        self.pushButton = QtWidgets.QPushButton(self.frame)
        self.pushButton.setGeometry(QtCore.QRect(270, 20, 351, 171))
        self.pushButton.setStyleSheet("border: none; border-radius: 5px;")
        self.pushButton.setText("")
        icon = QtGui.QIcon()
        icon.addPixmap(QtGui.QPixmap(":/login.webp"), QtGui.QIcon.Selected, QtGui.QIcon.On)
        self.pushButton.setIcon(icon)
        self.pushButton.setIconSize(QtCore.QSize(150, 150))
        self.pushButton.setObjectName("pushButton")

        self.label_5 = QtWidgets.QLabel(self.frame)
        self.label_5.setGeometry(QtCore.QRect(250, 210, 421, 51))
        font = QtGui.QFont()
        font.setPointSize(20)
        font.setBold(True)
        font.setWeight(75)
        self.label_5.setFont(font)
        self.label_5.setStyleSheet("color: #2F80ED; border: none;")
        self.label_5.setAlignment(QtCore.Qt.AlignCenter)
        self.label_5.setIndent(5)
        self.label_5.setObjectName("label_5")

        self.scrollArea = QtWidgets.QScrollArea(self.frame)
        self.scrollArea.setGeometry(QtCore.QRect(90, 290, 761, 361))
        self.scrollArea.setStyleSheet("border: none;")
        self.scrollArea.setWidgetResizable(True)
        self.scrollArea.setObjectName("scrollArea")

        self.scrollAreaWidgetContents = QtWidgets.QWidget()
        self.scrollAreaWidgetContents.setGeometry(QtCore.QRect(0, 0, 759, 359))
        self.scrollAreaWidgetContents.setObjectName("scrollAreaWidgetContents")

        font_input = QtGui.QFont()
        font_input.setPointSize(17)

        self.label = QtWidgets.QLabel(self.scrollAreaWidgetContents)
        self.label.setGeometry(QtCore.QRect(90, 60, 150, 50))
        self.label.setFont(font_input)
        self.label.setStyleSheet("color: #333333; background: none;")
        self.label.setObjectName("label")

        self.label_2 = QtWidgets.QLabel(self.scrollAreaWidgetContents)
        self.label_2.setGeometry(QtCore.QRect(90, 160, 150, 50))
        self.label_2.setFont(font_input)
        self.label_2.setStyleSheet("color: #333333; background: none;")
        self.label_2.setObjectName("label_2")

        self.lineEdit = QtWidgets.QLineEdit(self.scrollAreaWidgetContents)
        self.lineEdit.setGeometry(QtCore.QRect(260, 60, 381, 50))
        self.lineEdit.setStyleSheet("""
            background-color: #FFFFFF;
            border: 1px solid #DADADA;
            border-radius: 6px;
            padding-left: 10px;
        """)
        self.lineEdit.setEchoMode(QtWidgets.QLineEdit.Normal)
        self.lineEdit.setObjectName("lineEdit")

        self.lineEdit_2 = QtWidgets.QLineEdit(self.scrollAreaWidgetContents)
        self.lineEdit_2.setGeometry(QtCore.QRect(260, 160, 381, 50))
        self.lineEdit_2.setStyleSheet("""
            background-color: #FFFFFF;
            border: 1px solid #DADADA;
            border-radius: 6px;
            padding-left: 10px;
        """)
        self.lineEdit_2.setEchoMode(QtWidgets.QLineEdit.Password)
        self.lineEdit_2.setObjectName("lineEdit_2")

        self.pushButton_2 = QtWidgets.QPushButton(self.scrollAreaWidgetContents)
        self.pushButton_2.setGeometry(QtCore.QRect(330, 250, 121, 51))
        self.pushButton_2.setFont(font_input)
        self.pushButton_2.setStyleSheet("""
            QPushButton {
                background-color: #2F80ED;
                color: white;
                border-radius: 8px;
                font-weight: bold;
                border: none;
            }
            QPushButton:hover {
                background-color: #1C6DD0;
            }
        """)
        self.pushButton_2.setObjectName("pushButton_2")

        font_links = QtGui.QFont()
        font_links.setPointSize(10)

        self.label_3 = QtWidgets.QLabel(self.scrollAreaWidgetContents)
        self.label_3.setGeometry(QtCore.QRect(30, 300, 131, 21))
        self.label_3.setFont(font_links)
        self.label_3.setStyleSheet("color: #2F80ED; border: none;")
        self.label_3.setObjectName("label_3")

        self.label_4 = QtWidgets.QLabel(self.scrollAreaWidgetContents)
        self.label_4.setGeometry(QtCore.QRect(510, 300, 191, 21))
        self.label_4.setFont(font_links)
        self.label_4.setStyleSheet("color: #2F80ED; border: none;")
        self.label_4.setObjectName("label_4")

        self.scrollArea.setWidget(self.scrollAreaWidgetContents)

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