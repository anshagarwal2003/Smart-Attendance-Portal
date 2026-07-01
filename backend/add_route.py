with open('app.py', 'r') as f:
    content = f.read()

route = '''
@app.route('/server-time')
def server_time():
    return jsonify({
        'time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'day': datetime.now().strftime('%A'),
        'tz': os.environ.get('TZ', 'Not Set')
    })
'''

content = content.replace('def home():\n    return render_template("home.html")', 'def home():\n    return render_template("home.html")\n' + route)

with open('app.py', 'w') as f:
    f.write(content)
