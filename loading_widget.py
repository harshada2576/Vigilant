from PyQt5 import QtCore, QtGui, QtWidgets
from CipherLink.theme import *


class LoadingWidget(QtWidgets.QWidget):
    loading_finished = QtCore.pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMinimumSize(450, 200)
        apply_palette(self)

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

        self.timer = QtCore.QTimer(self)
        self.timer.timeout.connect(self.advance_progress)

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
        self.progress_bar.setRange(0, len(self.steps) * 20)
        self.progress_bar.setValue(0)
        self.progress_bar.setFixedHeight(24)

        layout.addWidget(self.progress_bar)

    def start_loading(self):
        self.current_step = 0
        self.progress_value = 0
        self.progress_bar.setValue(0)
        self.label.setText(self.steps[0])
        self.timer.start(100)  # 100ms interval

    def advance_progress(self):
        self.progress_value += 1
        self.progress_bar.setValue(self.progress_value)

        step_index = self.progress_value // 20
        if step_index >= len(self.steps):
            self.timer.stop()
            self.label.setText("Loading complete!")
            self.timer.start(1000) # 1000ms == 1sec interval
            self.loading_finished.emit()
            return

        if step_index != self.current_step:
            self.current_step = step_index
            self.label.setText(self.steps[self.current_step])
            
