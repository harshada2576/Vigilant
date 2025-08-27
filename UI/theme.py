from PyQt5.QtWidgets import QWidget

# === Define color palettes ===
PALETTES = {
    "light": {
        "background": "#FAFAFA",
        "primary_text": "#212121",
        "secondary_text": "#616161",
        "ui_borders": "#E0E0E0",
        "accent": "#2979FF",
        "shadow": "rgba(0,0,0,0.08)"
    },
    "medium": {
        "background": "#FFF8F0",
        "primary_text": "#4E4336",
        "secondary_text": "#7A6F63",
        "ui_borders": "#D7CFC5",
        "accent": "#F57C00",
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

CURRENT_PALETTE = "dark"

# yea check out te following qss template got 2 choice... uncomment the better only both dont remove the other one 
# cuz in my kali the themes are a bit funky with both

# === QSS Style Template ===
'''
QSS_TEMPLATE = """
QWidget {{
    background-color: {background};
    color: {primary_text};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
        Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 14px;
}}

QLabel {{
    color: {primary_text};
}}

QLabel#primary {{
    font-weight: bold;
    color: {accent};
}}

QLabel#chatHeader {{
    font-size: 18px;
    font-weight: bold;
    color: {primary_text};
}}

QLineEdit {{
    background-color: white;
    border: 1.5px solid {ui_borders};
    border-radius: 6px;
    padding: 10px;
    font-size: 15px;
    color: {primary_text};
}}

QPushButton {{
    background-color: {accent};
    color: white;
    border-radius: 6px;
    padding: 10px 20px;
    font-weight: 600;
}}

QPushButton:hover {{
    background-color: {primary_text};
    color: {background};
}}

QPushButton:pressed {{
    background-color: {accent};
    color: white;
}}

QProgressBar {{
    border: 1px solid {ui_borders};
    border-radius: 5px;
    text-align: center;
}}

QProgressBar::chunk {{
    background-color: {accent};
    width: 10px;
    margin: 1px;
}}

QListWidget {{
    border: 1px solid {ui_borders};
    background-color: {background};
    color: {primary_text};
}}

QTextEdit {{
    background-color: #f5f5f5;
    border-radius: 8px;
    padding: 8px;
    color: {primary_text};
    font-size: 14px;
}}
"""
'''

QSS_TEMPLATE = """
QWidget {{
    background-color: {background};
    color: {primary_text};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
        Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 14px;
}}

QMainWindow {{
    background-color: {background};
}}

QDialog {{
    background-color: {background};
}}

QFrame {{
    background-color: {background};
}}

QLabel {{
    color: {primary_text};
}}

QLabel#primary {{
    font-weight: bold;
    color: {accent};
}}

QLabel#chatHeader {{
    font-size: 18px;
    font-weight: bold;
    color: {primary_text};
}}

QLineEdit {{
    background-color: {background};
    border: 1.5px solid {ui_borders};
    border-radius: 6px;
    padding: 10px;
    font-size: 15px;
    color: {primary_text};
}}

QPushButton {{
    background-color: {accent};
    color: white;
    border-radius: 6px;
    padding: 10px 20px;
    font-weight: 600;
}}

QPushButton:hover {{
    background-color: {primary_text};
    color: {background};
}}

QPushButton:pressed {{
    background-color: {accent};
    color: white;
}}

QProgressBar {{
    border: 1px solid {ui_borders};
    border-radius: 5px;
    text-align: center;
    background-color: {background};
}}

QProgressBar::chunk {{
    background-color: {accent};
    width: 10px;
    margin: 1px;
}}

QListWidget {{
    border: 1px solid {ui_borders};
    background-color: {background};
    color: {primary_text};
}}

QTextEdit {{
    background-color: {background};
    border-radius: 8px;
    padding: 8px;
    color: {primary_text};
    font-size: 14px;
}}

QSplitter::handle {{
    background-color: {ui_borders};
}}

QScrollBar:vertical, QScrollBar:horizontal {{
    background-color: {background};
}}

QScrollBar::handle {{
    background-color: {accent};
}}

QListWidget::item:selected {{
    background-color: {accent};
    color: white;
}}
"""


# === Public Theme Functions ===

def get_palette():
    return CURRENT_PALETTE

def set_palette(name):
    global CURRENT_PALETTE
    if name in PALETTES:
        CURRENT_PALETTE = name
    else:
        raise ValueError(f"Invalid palette name: {name}")

def apply_palette(widget: QWidget):
    """Apply the current theme to a single widget."""
    style = QSS_TEMPLATE.format(**PALETTES[CURRENT_PALETTE])
    widget.setStyleSheet(style)

def refresh_theme(widget: QWidget):
    """Recursively apply the current theme to widget and its children."""
    apply_palette(widget)
    for child in widget.findChildren(QWidget):
        apply_palette(child)

# === Optional: Helper Themed Widgets ===

from PyQt5.QtWidgets import QPushButton, QLabel

def themed_button(text):
    btn = QPushButton(text)
    return btn

def themed_label(text, object_name=None):
    label = QLabel(text)
    if object_name:
        label.setObjectName(object_name)
    return label

