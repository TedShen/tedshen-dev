"""樹莓派步進馬達控制：正轉、反轉、指定步數／角度／轉速。

支援兩種常見接法：
- ULN2003 驅動板 + 28BYJ-48（4 條控制線，半步序列）
- 步進驅動器 A4988 / DRV8825 / TMC2209（STEP、DIR、EN 三條線）

另有 MockBackend，不接硬體也能在電腦上跑與測試。
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Callable, Protocol, Sequence

CW = 1    # 順時針（實際方向依接線而定，反了就把 CW/CCW 對調或交換線圈）
CCW = -1

# 28BYJ-48 半步序列：IN1..IN4 每一步的高低電位
HALF_STEP_SEQUENCE: tuple[tuple[int, int, int, int], ...] = (
    (1, 0, 0, 0),
    (1, 1, 0, 0),
    (0, 1, 0, 0),
    (0, 1, 1, 0),
    (0, 0, 1, 0),
    (0, 0, 1, 1),
    (0, 0, 0, 1),
    (1, 0, 0, 1),
)


class Backend(Protocol):
    """驅動方式的共同介面。"""

    def step(self, direction: int) -> None: ...
    def release(self) -> None: ...


@dataclass
class MockBackend:
    """不碰硬體，只記錄每一步，方便測試與在電腦上試跑。"""

    log: list[int] = field(default_factory=list)
    released: bool = False

    def step(self, direction: int) -> None:
        self.log.append(direction)
        self.released = False

    def release(self) -> None:
        self.released = True


class Uln2003Backend:
    """ULN2003 驅動板，四條線依半步序列輪流通電。"""

    def __init__(self, pins: Sequence[int] = (17, 18, 27, 22), output_factory: Callable[[int], object] | None = None):
        if len(pins) != 4:
            raise ValueError("ULN2003 需要 4 個 GPIO 腳位（IN1～IN4）")
        if output_factory is None:
            from gpiozero import OutputDevice  # 只有在樹莓派上才匯入

            output_factory = lambda pin: OutputDevice(pin, initial_value=False)  # noqa: E731
        self.outputs = [output_factory(p) for p in pins]
        self.index = 0

    def _apply(self, pattern: Sequence[int]) -> None:
        for out, value in zip(self.outputs, pattern):
            out.value = value  # type: ignore[attr-defined]

    def step(self, direction: int) -> None:
        self.index = (self.index + direction) % len(HALF_STEP_SEQUENCE)
        self._apply(HALF_STEP_SEQUENCE[self.index])

    def release(self) -> None:
        """全部斷電，馬達不會發燙，但也不再出力保持位置。"""
        self._apply((0, 0, 0, 0))


class StepDirBackend:
    """A4988 / DRV8825 / TMC2209 這類驅動器：DIR 決定方向，STEP 每一個脈衝走一步。"""

    PULSE_SECONDS = 5e-6  # STEP 高電位維持時間，遠大於驅動器規格的最小值

    def __init__(self, step_pin: int = 20, dir_pin: int = 21, enable_pin: int | None = 16,
                 output_factory: Callable[[int], object] | None = None):
        if output_factory is None:
            from gpiozero import OutputDevice

            output_factory = lambda pin: OutputDevice(pin, initial_value=False)  # noqa: E731
        self.step_out = output_factory(step_pin)
        self.dir_out = output_factory(dir_pin)
        # EN 腳是低電位啟用：0 = 出力，1 = 放開
        self.enable_out = output_factory(enable_pin) if enable_pin is not None else None
        self._set_enabled(True)

    def _set_enabled(self, on: bool) -> None:
        if self.enable_out is not None:
            self.enable_out.value = 0 if on else 1  # type: ignore[attr-defined]

    def step(self, direction: int) -> None:
        self._set_enabled(True)
        self.dir_out.value = 1 if direction == CW else 0  # type: ignore[attr-defined]
        self.step_out.value = 1  # type: ignore[attr-defined]
        time.sleep(self.PULSE_SECONDS)
        self.step_out.value = 0  # type: ignore[attr-defined]

    def release(self) -> None:
        self._set_enabled(False)


class StepperMotor:
    """以步數、角度或圈數控制馬達。

    steps_per_rev：轉一圈需要的步數。
      - 28BYJ-48 半步約 4096（不同批次略有差異，要精準請自己量）
      - 一般 1.8° 步進馬達（NEMA17）整步 200，乘上驅動器的微步數（例如 16 微步 = 3200）
    """

    def __init__(self, backend: Backend, steps_per_rev: int = 4096,
                 sleep: Callable[[float], None] = time.sleep):
        if steps_per_rev <= 0:
            raise ValueError("steps_per_rev 必須大於 0")
        self.backend = backend
        self.steps_per_rev = steps_per_rev
        self.sleep = sleep
        self.position = 0  # 目前位置（步），正轉加、反轉減

    def step_delay(self, rpm: float) -> float:
        """轉速換算成每一步之間的等待秒數。"""
        if rpm <= 0:
            raise ValueError("rpm 必須大於 0")
        return 60.0 / (rpm * self.steps_per_rev)

    def move_steps(self, steps: int, rpm: float = 10.0) -> None:
        """走指定步數。正數 = 正轉，負數 = 反轉。"""
        direction = CW if steps >= 0 else CCW
        delay = self.step_delay(rpm)
        for _ in range(abs(steps)):
            self.backend.step(direction)
            self.position += direction
            self.sleep(delay)

    def move_degrees(self, degrees: float, rpm: float = 10.0) -> int:
        """轉指定角度，回傳實際走的步數（四捨五入到整步）。"""
        steps = round(degrees / 360.0 * self.steps_per_rev)
        self.move_steps(steps, rpm)
        return steps

    def move_turns(self, turns: float, rpm: float = 10.0) -> int:
        return self.move_degrees(turns * 360.0, rpm)

    def release(self) -> None:
        self.backend.release()
