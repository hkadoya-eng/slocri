import os
import sys

def main():
    if len(sys.argv) < 3:
        print("Usage: check_mtime.py <file> <stamp>")
        sys.exit(1)

    xls = sys.argv[1]
    stamp = sys.argv[2]

    if not os.path.exists(xls):
        print("FILE_NOT_FOUND")
        sys.exit(1)

    mtime = str(os.path.getmtime(xls))
    prev = open(stamp, encoding="utf-8").read().strip() if os.path.exists(stamp) else ""

    if mtime == prev:
        print("NO_CHANGE")
        sys.exit(0)

    os.makedirs(os.path.dirname(stamp), exist_ok=True) if os.path.dirname(stamp) else None
    with open(stamp, "w", encoding="utf-8") as f:
        f.write(mtime)
    print("CHANGED")

if __name__ == "__main__":
    main()
