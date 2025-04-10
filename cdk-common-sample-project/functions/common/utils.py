# functions/common/utils.py

def greet(name: str) -> str:
    """ 
    指定した名前に挨拶する単純な関数
    """
    return f"Hello, {name}! Greetings from the common module."

if __name__ == '__main__':
    # ローカルテスト用
    test_name = 'World'
    print(greet(test_name))
