import ipaddress
from urllib.parse import urlparse


PRIVATE_HOSTS = {"localhost", "127.0.0.1", "::1", "0.0.0.0"}


def validate_inspection_url(url: str, allow_private: bool = False) -> None:
    parsed = urlparse(url)

    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Only http and https URLs are allowed")

    if not parsed.netloc:
        raise ValueError("URL host is required")

    host = parsed.hostname

    if not host:
        raise ValueError("URL host is required")

    if allow_private:
        return

    if host in PRIVATE_HOSTS:
        raise ValueError("Private/local URLs are not allowed")

    try:
        ip = ipaddress.ip_address(host)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            raise ValueError("Private/local IP addresses are not allowed")
    except ValueError as error:
        if "Private/local" in str(error):
            raise
        return