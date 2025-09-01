from PyQt5.QtWidgets import QApplication, QWidget, QInputDialog

app = QApplication([])

widget = QWidget()
text, ok = QInputDialog.getText(widget, "Input Dialog", "Enter your name:")
if ok:
    print("User entered:", text)

