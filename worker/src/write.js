const { stdout, stderr } = process;
function write(f, ...data) {
    const buff = Buffer.concat([...data.map((chunk) => Buffer.from(chunk))]);
    const str = buff.toString().replace(/\[█×(\d+),░×(\d+),_×(\d+)\]/g, (_, done, todo, width) => {
        width = parseInt(width, 10);
        done = parseInt(done, 10);
        todo = parseInt(todo, 10);
        const progress = done / (done + todo);
        const available = Math.max(1, stdout.columns - width + done + todo);
        done = Math.round(available * progress);
        todo = available - done;
        return `[${Array(done).fill("█").join("")}${Array(todo).fill("░").join("")}]`;
    });
    f.write(str);
}

export {
    stdout, stderr, write,
};
