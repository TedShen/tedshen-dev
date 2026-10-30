"""命令列操作：

  python3 cli.py --driver mock --turns 1              # 不接硬體試跑
  python3 cli.py --driver uln2003 --degrees 90        # 28BYJ-48 正轉 90 度
  python3 cli.py --driver uln2003 --degrees -90       # 反轉 90 度
  python3 cli.py --driver stepdir --steps-per-rev 3200 --turns 2 --rpm 60
"""
from __future__ import annotations

import argparse
import sys

from stepper import MockBackend, StepDirBackend, StepperMotor, Uln2003Backend


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="樹莓派步進馬達正反轉控制")
    p.add_argument("--driver", choices=["uln2003", "stepdir", "mock"], default="mock",
                   help="驅動方式：uln2003（28BYJ-48）、stepdir（A4988/DRV8825/TMC2209）、mock（不接硬體）")
    move = p.add_mutually_exclusive_group(required=True)
    move.add_argument("--steps", type=int, help="步數，負數為反轉")
    move.add_argument("--degrees", type=float, help="角度，負數為反轉")
    move.add_argument("--turns", type=float, help="圈數，負數為反轉")
    p.add_argument("--rpm", type=float, default=10.0, help="轉速（每分鐘圈數），預設 10")
    p.add_argument("--steps-per-rev", type=int, default=None,
                   help="一圈步數；uln2003 預設 4096，stepdir 預設 200（整步）")
    p.add_argument("--pins", type=int, nargs=4, default=[17, 18, 27, 22], metavar=("IN1", "IN2", "IN3", "IN4"),
                   help="ULN2003 的 GPIO（BCM 編號），預設 17 18 27 22")
    p.add_argument("--step-pin", type=int, default=20, help="STEP 腳 GPIO，預設 20")
    p.add_argument("--dir-pin", type=int, default=21, help="DIR 腳 GPIO，預設 21")
    p.add_argument("--enable-pin", type=int, default=16, help="EN 腳 GPIO，預設 16；給 -1 表示不接")
    p.add_argument("--hold", action="store_true", help="結束後保持通電（預設會放開，避免馬達發燙）")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if args.driver == "uln2003":
        backend = Uln2003Backend(args.pins)
        spr = args.steps_per_rev or 4096
    elif args.driver == "stepdir":
        backend = StepDirBackend(args.step_pin, args.dir_pin, None if args.enable_pin < 0 else args.enable_pin)
        spr = args.steps_per_rev or 200
    else:
        backend = MockBackend()
        spr = args.steps_per_rev or 4096

    motor = StepperMotor(backend, steps_per_rev=spr)
    try:
        if args.steps is not None:
            motor.move_steps(args.steps, args.rpm)
            steps = args.steps
        elif args.degrees is not None:
            steps = motor.move_degrees(args.degrees, args.rpm)
        else:
            steps = motor.move_turns(args.turns, args.rpm)
    except KeyboardInterrupt:
        print("\n中斷，停止馬達。")
        motor.release()
        return 130
    finally:
        if not args.hold:
            motor.release()

    print(f"完成：走了 {steps} 步，目前位置 {motor.position} 步（一圈 {spr} 步）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
