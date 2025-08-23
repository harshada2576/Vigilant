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

CURRENT_PALETTE = "light"

def get_palette():
    return CURRENT_PALETTE

def set_palete(name):
    global CURRENT_PLATTE
    if name in PALETTES.keys():
        CURRENT_PALETTE = name
    else:
        raise ValueError("Invalid Palette Name")

def apply_palette(widget):
    p = PALETTES[CURRENT_PALETTE]
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
