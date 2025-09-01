from PyQt5.QtCore import pyqtSignal
from PyQt5 import QtCore, QtGui, QtWidgets
from UI.theme import *
from backend.user_auth import load_user, verify_user, register_user

class LoginWidget(QtWidgets.QWidget):
    login_requested = QtCore.pyqtSignal(str, str)  # username, password
    login_success = pyqtSignal(str)  # Emit only username on success

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMinimumSize(400, 320)
        apply_palette(self)
        self.setup_ui()

    def setup_ui(self):
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(40, 30, 40, 30)
        layout.setSpacing(15)

        self.title = QtWidgets.QLabel("WELCOME BACK")
        font = QtGui.QFont()
        font.setPointSize(20)
        font.setBold(True)
        self.title.setFont(font)
        self.title.setAlignment(QtCore.Qt.AlignCenter)
        self.title.setStyleSheet(f"color: {PALETTES[CURRENT_PALETTE]['accent']};")
        layout.addWidget(self.title)

        form_layout = QtWidgets.QFormLayout()
        form_layout.setLabelAlignment(QtCore.Qt.AlignRight)
        form_layout.setFormAlignment(QtCore.Qt.AlignCenter)
        form_layout.setHorizontalSpacing(20)
        form_layout.setVerticalSpacing(20)

        self.username_input = QtWidgets.QLineEdit()
        self.username_input.setPlaceholderText("Enter Your Username/Email")
        form_layout.addRow("Username:", self.username_input)

        self.password_input = QtWidgets.QLineEdit()
        self.password_input.setPlaceholderText("Enter Your Password")
        self.password_input.setEchoMode(QtWidgets.QLineEdit.Password)
        form_layout.addRow("Password:", self.password_input)

        layout.addLayout(form_layout)

        self.login_button = QtWidgets.QPushButton("Login")
        self.login_button.setFixedHeight(40)
        self.username_input.returnPressed.connect(self.on_login_clicked)
        self.password_input.returnPressed.connect(self.on_login_clicked)
        self.login_button.clicked.connect(self.on_login_clicked)
        layout.addWidget(self.login_button, alignment=QtCore.Qt.AlignCenter)

        self.register_button = QtWidgets.QPushButton("Register")
        self.register_button.setFixedHeight(30)
        self.register_button.clicked.connect(self.on_register_clicked)
        layout.addWidget(self.register_button, alignment=QtCore.Qt.AlignCenter)

        self.status_label = QtWidgets.QLabel("")
        self.status_label.setAlignment(QtCore.Qt.AlignCenter)
        layout.addWidget(self.status_label)

    def on_login_clicked(self):
        username = self.username_input.text().strip()
        password = self.password_input.text()
        self.login_button.setEnabled(False)
        self.status_label.setText("")
        if not username or not password:
            self.status_label.setText("Please enter both username and password.")
            self.login_button.setEnabled(True)
            return

        link = verify_user(username, password)
        if link["success"]:
            self.status_label.setText(link["message"])
            self.login_success.emit(username)
            self.reset()
        else:
            # needs dynamic error handling through status_label
            self.status_label.setText(link["message"])
            self.login_button.setEnabled(True)

    def on_register_clicked(self):
        username = self.username_input.text().strip()
        password = self.password_input.text()
        self.register_button.setEnabled(False)
        self.status_label.setText("")
        if not username or not password:
            self.status_label.setText("Please enter both username and password.")
            self.register_button.setEnabled(True)
            return
        link = register_user(username, password)
        if link["success"]:
            self.status_label.setText(link["message"])
        else:
            # needs dynamic error handling through status_label
            self.status_label.setText(link["message"])
        self.register_button.setEnabled(True)

    def reset(self):
        self.username_input.clear()
        self.password_input.clear()
        self.login_button.setEnabled(True)
        self.register_button.setEnabled(True)

