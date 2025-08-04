import sys
from PyQt5 import QtCore, QtGui, QtWidgets

# Reuse the palette dict you have (simplified medium palette here)
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


class LoginWindow(QtWidgets.QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Login")
        self.setMinimumSize(400, 320)
        apply_palette(self, CURRENT_PALETTE)
        self.setup_ui()

    def setup_ui(self):
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(40, 30, 40, 30)
        layout.setSpacing(15)

        # Title
        self.title = QtWidgets.QLabel("WELCOME BACK")
        font = QtGui.QFont()
        font.setPointSize(20)
        font.setBold(True)
        self.title.setFont(font)
        self.title.setAlignment(QtCore.Qt.AlignCenter)
        self.title.setStyleSheet(f"color: {PALETTES[CURRENT_PALETTE]['accent']};")
        layout.addWidget(self.title)

        # Form layout
        form_layout = QtWidgets.QFormLayout()
        form_layout.setLabelAlignment(QtCore.Qt.AlignRight)
        form_layout.setFormAlignment(QtCore.Qt.AlignCenter)
        form_layout.setHorizontalSpacing(20)
        form_layout.setVerticalSpacing(20)

        # Username
        self.username_input = QtWidgets.QLineEdit()
        self.username_input.setPlaceholderText("Enter Your Username/Email")
        form_layout.addRow("Username:", self.username_input)

        # Password
        self.password_input = QtWidgets.QLineEdit()
        self.password_input.setPlaceholderText("Enter Your Password")
        self.password_input.setEchoMode(QtWidgets.QLineEdit.Password)
        form_layout.addRow("Password:", self.password_input)

        layout.addLayout(form_layout)

        # Login button
        self.login_button = QtWidgets.QPushButton("Login")
        self.login_button.setFixedHeight(40)
        self.login_button.clicked.connect(self.start_loading)
        layout.addWidget(self.login_button, alignment=QtCore.Qt.AlignCenter)

        # Loading animation label
        self.loading_label = QtWidgets.QLabel()
        self.loading_label.setAlignment(QtCore.Qt.AlignCenter)
        self.loading_label.setFixedSize(100, 100)
        self.loading_movie = QtGui.QMovie(":/loading-7528.gif")  # Ensure you have this in your resources
        self.loading_label.setMovie(self.loading_movie)
        self.loading_label.hide()
        layout.addWidget(self.loading_label, alignment=QtCore.Qt.AlignCenter)

        # Fade-in effect for loader
        self.opacity_effect = QtWidgets.QGraphicsOpacityEffect()
        self.loading_label.setGraphicsEffect(self.opacity_effect)
        self.opacity_effect.setOpacity(0.0)

    def start_loading(self):
        self.login_button.setEnabled(False)
        self.loading_label.show()
        self.loading_movie.start()

        self.animation = QtCore.QPropertyAnimation(self.opacity_effect, b"opacity")
        self.animation.setDuration(400)
        self.animation.setStartValue(0.0)
        self.animation.setEndValue(1.0)
        self.animation.start()

        # Simulate login delay then stop loading
        QtCore.QTimer.singleShot(3000, self.stop_loading)

    def stop_loading(self):
        self.loading_movie.stop()
        self.loading_label.hide()
        self.login_button.setEnabled(True)


if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)

    # You will need to load your resources_rc for icons/gifs here if needed
    # import resources_rc

    window = LoginWindow()
    window.show()
    sys.exit(app.exec_())
