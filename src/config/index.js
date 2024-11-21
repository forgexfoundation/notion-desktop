const platform = process.platform; // 'darwin', 'win32', 'linux'
const osInfo =
    platform === 'darwin'
        ? '(Macintosh; Intel Mac OS X 10_15_7)'
        : platform === 'win32'
            ? '(Windows NT 10.0; Win64; x64)'
            : '(X11; Linux x86_64)';

const config = {
    userAgent: `Mozilla/5.0 ${osInfo} AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`,
};

export { config };
