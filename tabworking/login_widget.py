from PyQt5.QtCore import pyqtSignal
from PyQt5 import QtCore, QtGui, QtWidgets

# === Define color palettes ===
PALETTES = {
    "light": {
        "background": "#FAFAFA",         # Slightly softer white
        "primary_text": "#212121",       # Darker charcoal for sharp contrast
        "secondary_text": "#616161",     # Medium grey for secondary text
        "ui_borders": "#E0E0E0",         # Light grey borders
        "accent": "#2979FF",             # Bright but calm blue accent
        "shadow": "rgba(0,0,0,0.08)"    # subtle shadow for elevation
    },
    "medium": {
        "background": "#FFF8F0",         # Softer warm beige
        "primary_text": "#4E4336",       # Slightly deeper brown
        "secondary_text": "#7A6F63",     # Muted taupe
        "ui_borders": "#D7CFC5",         # Light warm border
        "accent": "#F57C00",             # Warm orange
        "shadow": "rgba(0,0,0,0.10)"
    },
    "dark": {
        "background": "#121212",
        "primary_text": "#EAEAEA",
        "secondary_text": "#9E9E9E",
        "ui_borders": "#2A2A2A",
        "accent": "#BB86FC",
        "shadow": "rgba(0,0,0,0.20)"
    },
}

# (for checking) Choose current palette here: "light", "medium", or "dark"
CURRENT_PALETTE = "light"

def apply_palette(widget, palette_name):
    p = PALETTES[palette_name]
    style = f"""
    QWidget {{
        background-color: {p['background']};
        color: {p['primary_text']};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
            Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        font-size: 14px;
    }}
    QLabel {{
        color: {p['primary_text']};
    }}
    QLineEdit {{
        background-color: white;
        border: 1.5px solid {p['ui_borders']};
        border-radius: 6px;
        padding: 10px;
        font-size: 15px;
        color: {p['primary_text']};
    }}
    QPushButton {{
        background-color: {p['accent']};
        color: white;
        border-radius: 6px;
        padding: 10px 20px;
        font-weight: 600;
    }}
    QPushButton:hover {{
        background-color: {p['primary_text']};
        color: {p['background']};
    }}
    QPushButton:pressed {{
        background-color: {p['accent']};
        color: white;
    }}
    """
    widget.setStyleSheet(style)


class LoginWidget(QtWidgets.QWidget):
    login_requested = QtCore.pyqtSignal(str, str)  # username, password
    login_success = pyqtSignal(str, str)  # Will emit username and password on success

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMinimumSize(400, 320)
        apply_palette(self, CURRENT_PALETTE)
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
        self.login_button.clicked.connect(self.on_login_clicked)
        layout.addWidget(self.login_button, alignment=QtCore.Qt.AlignCenter)

    def on_login_clicked(self):
        username = self.username_input.text()
        password = self.password_input.text()
        self.login_button.setEnabled(False)
        self.login_requested.emit(username, password)

    def reset(self):
        self.username_input.clear()
        self.password_input.clear()
        self.login_button.setEnabled(True)

    def stop_loading(self):
        self.loading_movie.stop()
        self.loading_label.hide()
        self.login_button.setEnabled(True)

        username = self.username_input.text()
        password = self.password_input.text()
        self.login_success.emit(username, password)
