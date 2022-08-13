function zip(str, columns = process.stdout.columns ?? 80) {
    return str.replace(/\[(█*)(░*)\]/g, (_, done, todo) => `[█×${done.length},░×${todo.length},_×${columns}]`);
}

function unzip(str, columns = process.stdout.columns ?? 80) {
    if (!str.match(/\[█×(\d+),░×(\d+),_×(\d+)\]/g)) return str;
    str = str.replace(/\[█×(\d+),░×(\d+),_×(\d+)\]/g, (_, done, todo, width) => {
        width = parseInt(width, 10);
        done = parseInt(done, 10);
        todo = parseInt(todo, 10);
        const progress = done / (done + todo);
        const available = Math.max(1, columns - width + done + todo);
        done = Math.round(available * progress);
        todo = available - done;
        return `[${Array(done).fill("█").join("")}${Array(todo).fill("░").join("")}]`;
    });
    return str;
}

export { zip, unzip };
