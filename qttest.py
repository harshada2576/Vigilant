import os
os.environ["QT_QPA_PLATFORMTHEME"] = ""

import sys
from PyQt5.QtWidgets import QApplication, QWidget, QLabel

app = QApplication(sys.argv)
app.setStyle("Fusion")
app.setStyleSheet("QWidget { background-color: red; color: white; }")

window = QWidget()
window.setWindowTitle("Test")
window.resize(400, 200)

label = QLabel("This should be white text on red", window)
label.move(50, 90)

window.show()
sys.exit(app.exec_())
