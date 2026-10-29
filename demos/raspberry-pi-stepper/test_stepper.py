"""不接硬體的測試：python3 -m unittest -v"""
import unittest

from stepper import CCW, CW, HALF_STEP_SEQUENCE, MockBackend, StepDirBackend, StepperMotor, Uln2003Backend


class FakeOutput:
    """假的 GPIO 輸出，記錄每次寫入的值。"""

    def __init__(self, pin):
        self.pin = pin
        self.history = []
        self._value = 0

    @property
    def value(self):
        return self._value

    @value.setter
    def value(self, v):
        self._value = v
        self.history.append(v)


def no_sleep(_):
    pass


class StepperMotorTest(unittest.TestCase):
    def test_forward_and_reverse_steps(self):
        backend = MockBackend()
        motor = StepperMotor(backend, steps_per_rev=4096, sleep=no_sleep)
        motor.move_steps(10)
        motor.move_steps(-4)
        self.assertEqual(backend.log, [CW] * 10 + [CCW] * 4)
        self.assertEqual(motor.position, 6)

    def test_degrees_round_to_whole_steps(self):
        motor = StepperMotor(MockBackend(), steps_per_rev=4096, sleep=no_sleep)
        self.assertEqual(motor.move_degrees(90), 1024)
        self.assertEqual(motor.move_degrees(-45), -512)
        self.assertEqual(motor.position, 512)

    def test_turns(self):
        motor = StepperMotor(MockBackend(), steps_per_rev=200, sleep=no_sleep)
        self.assertEqual(motor.move_turns(1.5), 300)

    def test_step_delay_matches_rpm(self):
        motor = StepperMotor(MockBackend(), steps_per_rev=200, sleep=no_sleep)
        # 60 rpm = 每秒 1 圈 = 每秒 200 步 → 每步 5 ms
        self.assertAlmostEqual(motor.step_delay(60), 0.005)

    def test_invalid_values(self):
        with self.assertRaises(ValueError):
            StepperMotor(MockBackend(), steps_per_rev=0)
        with self.assertRaises(ValueError):
            StepperMotor(MockBackend()).step_delay(0)

    def test_sleep_called_once_per_step(self):
        calls = []
        motor = StepperMotor(MockBackend(), steps_per_rev=4096, sleep=calls.append)
        motor.move_steps(5, rpm=10)
        self.assertEqual(len(calls), 5)


class Uln2003BackendTest(unittest.TestCase):
    def test_follows_half_step_sequence_both_directions(self):
        b = Uln2003Backend(output_factory=FakeOutput)
        seen = []
        for _ in range(8):
            b.step(CW)
            seen.append(tuple(o.value for o in b.outputs))
        self.assertEqual(seen, list(HALF_STEP_SEQUENCE[1:]) + [HALF_STEP_SEQUENCE[0]])
        b.step(CCW)
        self.assertEqual(tuple(o.value for o in b.outputs), HALF_STEP_SEQUENCE[7])

    def test_release_turns_all_coils_off(self):
        b = Uln2003Backend(output_factory=FakeOutput)
        b.step(CW)
        b.release()
        self.assertEqual([o.value for o in b.outputs], [0, 0, 0, 0])

    def test_requires_four_pins(self):
        with self.assertRaises(ValueError):
            Uln2003Backend(pins=(1, 2, 3), output_factory=FakeOutput)


class StepDirBackendTest(unittest.TestCase):
    def test_direction_pulse_and_enable(self):
        b = StepDirBackend(output_factory=FakeOutput)
        b.step(CW)
        self.assertEqual(b.dir_out.value, 1)
        self.assertEqual(b.step_out.history[-2:], [1, 0])
        self.assertEqual(b.enable_out.value, 0)  # 低電位 = 啟用
        b.step(CCW)
        self.assertEqual(b.dir_out.value, 0)
        b.release()
        self.assertEqual(b.enable_out.value, 1)

    def test_without_enable_pin(self):
        b = StepDirBackend(enable_pin=None, output_factory=FakeOutput)
        b.step(CW)
        b.release()
        self.assertIsNone(b.enable_out)


if __name__ == "__main__":
    unittest.main()
