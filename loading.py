import sys
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

# Choose current palette here: "light", "medium", or "dark"
CURRENT_PALETTE = "light"

def apply_palette(widget, palette_name):
    p = PALETTES[palette_name]
    stylesheet = f"""
    QWidget {{
        background-color: {p['background']};
        color: {p['primary_text']};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
            Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        font-size: 14px;
        selection-background-color: {p['accent']};
        selection-color: {p['background']};
    }}

    QLabel#primary {{
        font-weight: 600;
        font-size: 16px;
        color: {p['primary_text']};
    }}

    QLabel#secondary {{
        color: {p['secondary_text']};
        font-size: 13px;
    }}

    QProgressBar {{
        border: 1.5px solid {p['ui_borders']};
        border-radius: 6px;
        background-color: {p['ui_borders']};
        text-align: center;
        color: {p['primary_text']};
        padding: 4px;
    }}

    QProgressBar::chunk {{
        background-color: {p['accent']};
        border-radius: 6px;
        margin: 0;
    }}

    QPushButton {{
        background-color: {p['accent']};
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 20px;
        font-weight: 600;
    }}

    QPushButton:pressed {{
        background-color: {p['accent']};
        color: white;
    }}

    QPushButton:hover {{
        background-color: {p['primary_text']};
        color: {p['background']};
    }}
    """

    widget.setStyleSheet(stylesheet)


class LoadingScreen(QtWidgets.QDialog):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Loading...")
        self.setMinimumSize(450, 200)
        self.setWindowFlags(self.windowFlags() | QtCore.Qt.FramelessWindowHint)
        self.setAttribute(QtCore.Qt.WA_TranslucentBackground)

        apply_palette(self, CURRENT_PALETTE)

        self.steps = [
            "Connecting to server...",
            "Loading user data...",
            "Preparing interface...",
            "Finalizing setup...",
            "Done!"
        ]

        self.current_step = 0
        self.progress_value = 0

        self.setup_ui()

        self.timer = QtCore.QTimer()
        self.timer.timeout.connect(self.advance_progress)

        # Start automatically shortly after showing
        QtCore.QTimer.singleShot(150, self.start_loading)

        # Opacity effect for fade out transition
        self.opacity_effect = QtWidgets.QGraphicsOpacityEffect(self)
        self.setGraphicsEffect(self.opacity_effect)
        self.opacity_anim = QtCore.QPropertyAnimation(self.opacity_effect, b"opacity")
        self.opacity_anim.setDuration(800)
        self.opacity_anim.finished.connect(self.on_fade_out_finished)

    def setup_ui(self):
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(50, 40, 50, 40)
        layout.setSpacing(20)

        self.label = QtWidgets.QLabel(self.steps[0])
        self.label.setAlignment(QtCore.Qt.AlignCenter)
        self.label.setObjectName("primary")
        font = self.label.font()
        font.setPointSize(16)
        self.label.setFont(font)
        layout.addWidget(self.label)

        self.progress_bar = QtWidgets.QProgressBar()
        self.progress_bar.setRange(0, len(self.steps) * 20)  # 20 units per step for smoothness
        self.progress_bar.setValue(0)
        self.progress_bar.setFixedHeight(24)

        shadow = QtWidgets.QGraphicsDropShadowEffect() # for adding shadow -- not done by stylesheet
        shadow.setBlurRadius(12)
        shadow.setXOffset(0)
        shadow.setYOffset(3)
        shadow.setColor(QtGui.QColor(0, 0, 0, 50))  # semi-transparent black
        self.progress_bar.setGraphicsEffect(shadow)

        layout.addWidget(self.progress_bar)

    def start_loading(self):
        self.timer.start(100)  # Tick every 100ms

    def advance_progress(self):
        self.progress_value += 1
        self.progress_bar.setValue(self.progress_value)

        # Each step covers 20 units progress
        step_index = self.progress_value // 20
        if step_index >= len(self.steps):
            self.timer.stop()
            self.label.setText("Loading complete!")
            self.fade_out()
            return

        # Update step label only if changed
        if step_index != self.current_step:
            self.current_step = step_index
            self.label.setText(self.steps[self.current_step])

    def fade_out(self):
        self.opacity_anim.setStartValue(1.0)
        self.opacity_anim.setEndValue(0.0)
        self.opacity_anim.start()

    def on_fade_out_finished(self):
        self.accept()  # Close loading dialog


class MainWindow(QtWidgets.QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Main Application")
        self.setMinimumSize(700, 450)
        apply_palette(self, CURRENT_PALETTE)

        central = QtWidgets.QWidget()
        self.setCentralWidget(central)
        layout = QtWidgets.QVBoxLayout(central)

        label = QtWidgets.QLabel("Welcome to the main application!")
        label.setAlignment(QtCore.Qt.AlignCenter)
        font = label.font()
        font.setPointSize(18)
        label.setFont(font)
        layout.addWidget(label)

        # Just for demonstration, add a button with accent color
        button = QtWidgets.QPushButton("Do Something")
        layout.addWidget(button, alignment=QtCore.Qt.AlignCenter)


def main():
    app = QtWidgets.QApplication(sys.argv)

    loading = LoadingScreen()
    if loading.exec_() == QtWidgets.QDialog.Accepted:
        window = MainWindow()
        window.show()
        sys.exit(app.exec_())
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
