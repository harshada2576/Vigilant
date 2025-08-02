# -*- coding: utf-8 -*-
from PyQt5 import QtCore, QtGui, QtWidgets
import resources_rc  

class Ui_window(object):
    def setupUi(self, window):
        window.setObjectName("window")
        window.resize(950, 750)
        window.setMaximumSize(QtCore.QSize(950, 750))
        window.setStyleSheet("background-color: #F5F7FA; border: none;")

        self.frame = QtWidgets.QFrame(window)
        self.frame.setGeometry(QtCore.QRect(10, 10, 911, 701))
        self.frame.setStyleSheet("background-color: #F5F7FA; border: none;")
        self.frame.setFrameShape(QtWidgets.QFrame.StyledPanel)
        self.frame.setFrameShadow(QtWidgets.QFrame.Raised)
        self.frame.setObjectName("frame")

        # App Logo
        self.pushButton = QtWidgets.QPushButton(self.frame)
        self.pushButton.setGeometry(QtCore.QRect(270, 20, 351, 171))
        self.pushButton.setStyleSheet("border: none; border-radius: 5px;")
        self.pushButton.setText("")
        icon = QtGui.QIcon()
        icon.addPixmap(QtGui.QPixmap(":/login.webp"), QtGui.QIcon.Normal, QtGui.QIcon.Off)
        self.pushButton.setIcon(icon)
        self.pushButton.setIconSize(QtCore.QSize(150, 150))
        self.pushButton.setObjectName("pushButton")

        # Welcome Label
        self.label_5 = QtWidgets.QLabel(self.frame)
        self.label_5.setGeometry(QtCore.QRect(250, 210, 421, 51))
        font = QtGui.QFont()
        font.setPointSize(20)
        font.setBold(True)
        font.setWeight(75)
        self.label_5.setFont(font)
        self.label_5.setStyleSheet("color: #2F80ED;")
        self.label_5.setAlignment(QtCore.Qt.AlignCenter)
        self.label_5.setObjectName("label_5")

        # Scroll Area for Form
        self.scrollArea = QtWidgets.QScrollArea(self.frame)
        self.scrollArea.setGeometry(QtCore.QRect(90, 290, 761, 500))  # Increased height
        self.scrollArea.setStyleSheet("border: none;")
        self.scrollArea.setWidgetResizable(True)
        self.scrollArea.setObjectName("scrollArea")

        # Form Widget Contents
        self.scrollAreaWidgetContents = QtWidgets.QWidget()
        self.scrollAreaWidgetContents.setGeometry(QtCore.QRect(0, 0, 761, 420))  # Match scroll area
        self.scrollAreaWidgetContents.setObjectName("scrollAreaWidgetContents")

        # Username Field
        self.label = QtWidgets.QLabel(self.scrollAreaWidgetContents)
        self.label.setGeometry(QtCore.QRect(90, 60, 150, 50))
        self.label.setFont(QtGui.QFont("Arial", 17))
        self.label.setStyleSheet("color: #333333;")
        self.label.setObjectName("label")

        self.lineEdit = QtWidgets.QLineEdit(self.scrollAreaWidgetContents)
        self.lineEdit.setGeometry(QtCore.QRect(260, 60, 381, 50))
        self.lineEdit.setFont(QtGui.QFont("Arial", 15))
        self.lineEdit.setStyleSheet("""
            background-color: #FFFFFF;
            border: 1px solid #DADADA;
            border-radius: 6px;
            padding-left: 10px;
        """)
        self.lineEdit.setPlaceholderText("Enter Your Username/Email")
        self.lineEdit.setObjectName("lineEdit")

        # Password Field
        self.label_2 = QtWidgets.QLabel(self.scrollAreaWidgetContents)
        self.label_2.setGeometry(QtCore.QRect(90, 160, 150, 50))
        self.label_2.setFont(QtGui.QFont("Arial", 17))
        self.label_2.setStyleSheet("color: #333333;")
        self.label_2.setObjectName("label_2")

        self.lineEdit_2 = QtWidgets.QLineEdit(self.scrollAreaWidgetContents)
        self.lineEdit_2.setGeometry(QtCore.QRect(260, 160, 381, 50))
        self.lineEdit_2.setFont(QtGui.QFont("Arial", 15))
        self.lineEdit_2.setStyleSheet("""
            background-color: #FFFFFF;
            border: 1px solid #DADADA;
            border-radius: 6px;
            padding-left: 10px;
        """)
        self.lineEdit_2.setEchoMode(QtWidgets.QLineEdit.Password)
        self.lineEdit_2.setPlaceholderText("Enter Your Password")
        self.lineEdit_2.setObjectName("lineEdit_2")

        # Login Button
        self.pushButton_2 = QtWidgets.QPushButton(self.scrollAreaWidgetContents)
        self.pushButton_2.setGeometry(QtCore.QRect(330, 250, 121, 51))
        self.pushButton_2.setFont(QtGui.QFont("Arial", 15))
        self.pushButton_2.setStyleSheet("""
            QPushButton {
                background-color: #2F80ED;
                color: white;
                border-radius: 8px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #1C6DD0;
            }
        """)
        self.pushButton_2.setObjectName("pushButton_2")

        # Loading GIF
        self.loadinglabel = QtWidgets.QLabel(self.scrollAreaWidgetContents)
        self.loadinglabel.setGeometry(QtCore.QRect(330, 320, 121, 90))  # Centered and fully visible
        self.loadinglabel.setAlignment(QtCore.Qt.AlignCenter)
        self.loadinglabel.setStyleSheet("background-color: transparent;")
        self.loadinglabel.setScaledContents(True)

        self.movie = QtGui.QMovie(":/loading-7528.gif")
        self.loadinglabel.setMovie(self.movie)
        self.loadinglabel.hide()

        # Fade-in effect
        self.opacity_effect = QtWidgets.QGraphicsOpacityEffect()
        self.loadinglabel.setGraphicsEffect(self.opacity_effect)
        self.opacity_effect.setOpacity(0.0)

        # Footer Links
        self.label_3 = QtWidgets.QLabel(self.scrollAreaWidgetContents)
        self.label_3.setGeometry(QtCore.QRect(30, 300, 131, 21))
        self.label_3.setFont(QtGui.QFont("Arial", 10))
        self.label_3.setStyleSheet("color: #2F80ED;")
        self.label_3.setObjectName("label_3")

        self.label_4 = QtWidgets.QLabel(self.scrollAreaWidgetContents)
        self.label_4.setGeometry(QtCore.QRect(510, 300, 191, 21))
        self.label_4.setFont(QtGui.QFont("Arial", 10))
        self.label_4.setStyleSheet("color: #2F80ED;")
        self.label_4.setObjectName("label_4")

        self.scrollArea.setWidget(self.scrollAreaWidgetContents)

        self.retranslateUi(window)
        QtCore.QMetaObject.connectSlotsByName(window)

        # Connect signals
        self.pushButton_2.clicked.connect(self.show_loader)

    def show_loader(self):
        """Show the loading animation with fade-in"""
        self.loadinglabel.show()
        self.movie.start()

        # Fade-in animation
        self.animation = QtCore.QPropertyAnimation(self.opacity_effect, b"opacity")
        self.animation.setDuration(500)
        self.animation.setStartValue(0.0)
        self.animation.setEndValue(1.0)
        self.animation.start()

        # Hide after 3 seconds
        QtCore.QTimer.singleShot(10000, self.hide_loader)

    def hide_loader(self):
        """Hide the loading animation"""
        self.movie.stop()
        self.loadinglabel.hide()

    def retranslateUi(self, window):
        _translate = QtCore.QCoreApplication.translate
        window.setWindowTitle(_translate("window", "Login"))
        self.label_5.setText(_translate("window", "WELCOME BACK"))
        self.label.setText(_translate("window", "Username"))
        self.label_2.setText(_translate("window", "Password"))
        self.pushButton_2.setText(_translate("window", "Login"))
        self.label_3.setText(_translate("window", "Forgot Password?"))
        self.label_4.setText(_translate("window", "New User? Register Now"))

if __name__ == "__main__":
    import sys
    app = QtWidgets.QApplication(sys.argv)
    window = QtWidgets.QWidget()
    ui = Ui_window()
    ui.setupUi(window)
    window.show()
    sys.exit(app.exec_())